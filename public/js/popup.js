$(document).ready(function () {
    loadSavedData();

    $("#generatePdf").on("click", async function () {
        let title = $("#titleInput").val().trim();
        let text = $("#textInput").val().trim();
        let wordsPerChunk = parseInt($("#wordCount").val());
        let lang = $("#languageSelect").val();

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

        // אם עברית וה-checkbox מסומן – הסר ניקוד
        if (lang === "he" && $("#removeNikkudCheckbox").is(":checked")) {
            title = await removeHebrewNikkud(title);
            text = await removeHebrewNikkud(text);
        }

        // חלוקת הטקסט למקטעים לפי מספר מילים אמיתי
        // let rawTokens = text.split(/\s+/); // מפריד לפי רווחים

        // קודם מסירים רווחים כפולים וקפיצות שורה
        let cleanedText = text.replace(/\s+/g, " ").trim();

        // עכשיו מפרידים למילים
        let rawTokens = cleanedText.split(" ");
        let chunks = [];
        let currentChunk = [];
        let wordCounter = 0;

        rawTokens.forEach((token) => {
            currentChunk.push(token); // שומר את הטוקן עם הפיסוק
            // בודק אם יש לפחות אות או מספר במילה (עברית/אנגלית/ספרה)
            if (/[A-Za-z\u0590-\u05FF0-9]/.test(token)) {
                wordCounter++;
            }

            if (wordCounter === wordsPerChunk) {
                chunks.push(currentChunk.join(" ")); // שומר פיסקה
                currentChunk = [];
                wordCounter = 0;
            }
        });

        // אם נשארו טוקנים אחרי הספירה
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(" "));
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
        if (title) {
            doc.setFontSize(lang === "he" ? 22 : 20);

            doc.text(title, lang === "he" ? 200 : 10, y, {
                align: lang === "he" ? "right" : "left",
            });

            y += 9; // רווח אחרי הכותרת

            doc.setFontSize(lang === "he" ? 14 : 12);
        }

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

    $("#languageSelect").on("change", function () {
        let lang = $(this).val();

        if (lang === "he") {
            $("#removeNikkudWrapper").show();
            $("#removeNikkudCheckbox").prop("checked", false);
        } else {
            $("#removeNikkudWrapper").hide();
            $("#removeNikkudCheckbox").prop("checked", false);
        }
    });

    // שדות טקסט וכותרת
    $("#textInput, #titleInput").on("input", function () {
        savePopupData();
    });

    // מספר מילים
    $("#wordCount").on("input", function () {
        savePopupData();
    });

    // select שפה
    $("#languageSelect").on("change", function () {
        savePopupData();
    });

    // checkbox
    $("#removeNikkudCheckbox").on("change", function () {
        savePopupData();
    });

    $("#resetPopup").on("click", function () {
        $("#titleInput").val("");
        $("#textInput").val("");
        $("#wordCount").val("90");
        $("#languageSelect").val("he");
        $("#removeNikkudCheckbox").prop("checked", false);

        localStorage.removeItem("text_splitter_extension_title");
        localStorage.removeItem("text_splitter_extension_text");
        localStorage.removeItem("text_splitter_extension_wordCount");
        localStorage.removeItem("text_splitter_extension_language");
        localStorage.removeItem("text_splitter_extension_removeNikkud");
    });

    function savePopupData() {
        localStorage.setItem("text_splitter_extension_title", $("#titleInput").val());
        localStorage.setItem("text_splitter_extension_text", $("#textInput").val());
        localStorage.setItem("text_splitter_extension_wordCount", $("#wordCount").val());
        localStorage.setItem("text_splitter_extension_language", $("#languageSelect").val());
        localStorage.setItem(
            "text_splitter_extension_removeNikkud",
            $("#removeNikkudCheckbox").is(":checked"),
        );
    }

    function loadSavedData() {
        let savedTitle = localStorage.getItem("text_splitter_extension_title");
        let savedText = localStorage.getItem("text_splitter_extension_text");
        let savedWordCount = localStorage.getItem("text_splitter_extension_wordCount");
        let savedLanguage = localStorage.getItem("text_splitter_extension_language");
        let savedRemoveNikkud = localStorage.getItem("text_splitter_extension_removeNikkud");

        if (savedTitle) {
            $("#titleInput").val(savedTitle);
        }
        if (savedText) {
            $("#textInput").val(savedText);
        }
        if (savedWordCount) {
            $("#wordCount").val(savedWordCount);
        }
        if (savedLanguage) {
            $("#languageSelect").val(savedLanguage);
        }
        if (savedRemoveNikkud) {
            $("#removeNikkudCheckbox").prop("checked", JSON.parse(savedRemoveNikkud));
        }
    }

    // function removeHebrewNikkud(text) {
    //     return text.replace(/[\u0591-\u05C7]/g, "");
    // }

    async function removeHebrewNikkud(text) {
        try {
            const response = await fetch(
                "https://remove-nikud-2-0.loadbalancer2.dicta.org.il/api",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        data: text,
                        genre: "rabbinic",
                        maqaf: 1,
                        fQQ: true,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error("Network response was not ok: " + response.statusText);
            }

            const result = await response.json();

            // לפי ה־API, הניקוד המוסר מוחזר כנראה ב־result.data
            return result.results || text;
        } catch (err) {
            console.error("Error removing Hebrew nikud:", err);
            return text; // במקרה של שגיאה, מחזיר את הטקסט המקורי
        }
    }

    function normalizeSpaces(text) {
        // מחליף כל רצף של רווחים, טאבים או קפיצות שורה ברווח אחד
        return text.replace(/\s+/g, " ").trim();
    }
});
