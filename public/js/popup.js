$(document).ready(function () {
    $("#generatePdf").click(async function () {
        let lang = $("#languageSelect").val();
        let text = $("#textInput").val().trim();
        let wordsPerChunk = parseInt($("#wordCount").val());

        // בדיקות שגיאות
        if (!text || text === "") {
            alert(
                lang === "he"
                    ? "יש להזין טקסט לפני יצירת ה-PDF."
                    : "Please enter text before generating PDF.",
            );
            return;
        }

        if (!wordsPerChunk || wordsPerChunk <= 0) {
            alert(
                lang === "he"
                    ? "יש להזין מספר מילים חוקי הגדול מ־0."
                    : "Please enter a valid word count greater than 0.",
            );
            return;
        }

        // חלוקת הטקסט למקטעים
        let words = text.split(/\s+/);
        let chunks = [];
        for (let i = 0; i < words.length; i += wordsPerChunk) {
            chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
        }

        // יצירת PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        if (lang === "he") {
            // טעינת הפונט
            const fontUrl = "public/fonts/Assistant-Regular.ttf";
            const response = await fetch(fontUrl);
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const fontBase64 = btoa(binary);

            doc.addFileToVFS("Assistant-Regular.ttf", fontBase64);
            doc.addFont("Assistant-Regular.ttf", "Assistant", "normal");
            doc.setFont("Assistant");
            doc.setFontSize(14);
            doc.setR2L(true); // RTL
        } else {
            doc.setFont("helvetica");
            doc.setFontSize(12);
            doc.setR2L(false); // LTR
        }

        let y = 20;
        let lineHeight = 5.5; // גובה שורה
        chunks.forEach((chunk) => {
            let lines = doc.splitTextToSize(chunk, 180);

            if (y + lines.length * lineHeight > 280) {
                doc.addPage();
                y = 20;
            }

            // כתיבת הטקסט
            doc.text(lines, lang === "he" ? 200 : 10, y, {
                align: lang === "he" ? "right" : "left",
            });

            // עדכון y – רווח של שורה אחת בלבד בין פסקאות
            y += lines.length * lineHeight; // הפסקה עצמה
            y += lineHeight; // רווח של שורה אחת בלבד
        });

        const fileName = `split-text_${Date.now()}.pdf`;
        doc.save(fileName);
    });
});
