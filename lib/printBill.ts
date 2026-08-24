import { createClient } from "./supabaseClient";

// Opens a print-ready receipt sized for 58mm ("2 inch") thermal printers.
// The HTML itself (including any UPI QR code) is generated entirely
// server-side by app/api/admin/receipt/route.ts, which reads the real
// UPI settings directly from the database — this file never has access to
// UPI data and can't influence what VPA ends up in the QR, so a compromised
// or tampered admin browser session can't bake in an attacker's own VPA.
export async function openThermalPrintWindow(orderId: string) {
  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) {
    alert("Please allow pop-ups to print the bill.");
    return;
  }
  printWindow.document.write("Loading receipt...");

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch("/api/admin/receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    if (!res.ok) {
      printWindow.document.body.innerText = "Failed to generate receipt. Please try again.";
      return;
    }

    const { html } = await res.json();
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } catch (e) {
    console.error(e);
    printWindow.document.body.innerText = "Something went wrong generating the receipt.";
  }
}
