import { Test } from "@nestjs/testing";
import { CredentialsService } from "./credentials.service";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService } from "../blockchain/blockchain.service";

describe("CredentialsService.verify", () => {
  let service: CredentialsService;
  let prisma: any;
  let blockchain: any;

  const baseCredential = {
    credentialId: "CRED-2026-000001",
    studentName: "Rahul Sharma",
    studentId: "STU2026001",
    universityName: "Demo University",
    degree: "BCA",
    course: "Computer Applications",
    department: "Computer Science",
    graduationYear: 2026,
    issueDate: new Date("2026-06-15T00:00:00.000Z"),
    grade: "8.7 CGPA",
    status: "VALID",
    blockchainTxHash: "0xabc123",
    network: "Hardhat Local",
    contractAddress: "0xContract",
    revocation: null,
  };

  beforeEach(async () => {
    prisma = { credential: { findUnique: jest.fn() } };
    blockchain = {
      computeHash: jest.fn().mockReturnValue("0xhash"),
      verifyCredential: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = moduleRef.get(CredentialsService);
  });

  it("returns NOT_FOUND when the credential does not exist in the database", async () => {
    prisma.credential.findUnique.mockResolvedValue(null);
    const result = await service.verify("CRED-2026-999999");
    expect(result.status).toBe("NOT_FOUND");
  });

  it("returns REVOKED with reason and date when the credential is revoked", async () => {
    prisma.credential.findUnique.mockResolvedValue({
      ...baseCredential,
      status: "REVOKED",
      credentialHash: "0xhash",
      revocation: { reason: "Academic misconduct", revokedAt: new Date("2026-07-01"), blockchainTxHash: "0xrevoke" },
    });
    blockchain.verifyCredential.mockResolvedValue({
      exists: true,
      credentialHash: "0xhash",
      isRevoked: true,
      revocationReason: "Academic misconduct",
    });

    const result: any = await service.verify("CRED-2026-000001");
    expect(result.status).toBe("REVOKED");
    expect(result.reason).toBe("Academic misconduct");
  });

  it("returns VALID when the credential exists, is not revoked, and hash matches", async () => {
    prisma.credential.findUnique.mockResolvedValue({ ...baseCredential, credentialHash: "0xhash" });
    blockchain.verifyCredential.mockResolvedValue({
      exists: true,
      credentialHash: "0xhash",
      isRevoked: false,
      revocationReason: "",
    });

    const result: any = await service.verify("CRED-2026-000001");
    expect(result.status).toBe("VALID");
    expect(result.credential.studentName).toBe("Rahul Sharma");
    expect(result.integrity.hashMatchesDatabase).toBe(true);
  });
});

describe("CredentialsService institution scoping", () => {
  let service: CredentialsService;
  let prisma: any;
  let blockchain: any;

  beforeEach(async () => {
    prisma = {
      credential: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
      },
      institution: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "inst-a", name: "Alpha University" }) },
    };
    blockchain = {
      computeHash: jest.fn().mockReturnValue("0xhash"),
      issueCredential: jest.fn().mockResolvedValue({ txHash: "0xtx", blockNumber: 1, contractAddress: "0xc", network: "Test" }),
      revokeCredential: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();
    service = moduleRef.get(CredentialsService);
  });

  it("refuses to revoke another institution's credential and never touches the chain", async () => {
    prisma.credential.findFirst.mockResolvedValue(null);
    await expect(service.revoke("CRED-2026-000001", { reason: "not mine" }, "inst-b")).rejects.toThrow("Credential not found.");
    expect(prisma.credential.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { credentialId: "CRED-2026-000001", institutionId: "inst-b" } }));
    expect(blockchain.revokeCredential).not.toHaveBeenCalled();
  });

  it("issues under the institution's registered name and records ownership", async () => {
    await service.issue(
      {
        studentName: "S",
        studentId: "STU1",
        degree: "BCA",
        course: "CA",
        department: "CS",
        graduationYear: 2026,
        issueDate: "2026-06-15",
        grade: "A",
      },
      "inst-a"
    );
    const data = prisma.credential.create.mock.calls[0][0].data;
    expect(data.universityName).toBe("Alpha University");
    expect(data.institutionId).toBe("inst-a");
  });

  it("lists only the caller's credentials", async () => {
    prisma.credential.findMany = jest.fn().mockResolvedValue([]);
    await service.list({}, "inst-a");
    expect(prisma.credential.findMany.mock.calls[0][0].where).toMatchObject({ institutionId: "inst-a" });
  });
});
