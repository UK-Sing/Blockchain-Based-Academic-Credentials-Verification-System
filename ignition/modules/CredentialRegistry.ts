import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CredentialRegistryModule", (m) => {
    const credentialRegistry = m.contract("CredentialRegistry", [m.getAccount(0)]);

    return { credentialRegistry };
});