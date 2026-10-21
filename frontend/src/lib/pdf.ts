/** Attribute marking the element that is captured; its preview scaling is removed in the capture clone. */
export const PDF_ROOT_ATTR = "data-pdf-root";

/**
 * Renders a DOM element to an A4-landscape PDF and triggers a download.
 * html2canvas and jsPDF are loaded on demand so they don't bloat the initial bundle.
 */
export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    onclone: (doc) => {
      const clone = doc.querySelector<HTMLElement>(`[${PDF_ROOT_ATTR}]`);
      if (clone) clone.style.transform = "none";
    },
  });

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);
  pdf.save(filename);
}
