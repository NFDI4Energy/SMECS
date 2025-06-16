// src/download.js
/**
 * Grab the JSON from the textarea and trigger a download as a .json file.
 */
export function downloadFile() {
    // 1. Read the metadata JSON text from the textarea
    const textarea = document.getElementById("metadata-json");
    if (!textarea) return;
    const metadata = textarea.value;
  
    // 2. Create a Blob and an object URL
    const blob = new Blob([metadata], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
  
    // 3. Create a temporary <a> element to trigger the download
    const a = document.createElement("a");
    a.href     = url;
    a.download = "metadata.json";   // default filename
    document.body.appendChild(a);
    a.click();
  
    // 4. Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }