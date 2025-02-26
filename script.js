function processImage(fileInputId, outputId) {
    const fileInput = document.getElementById(fileInputId);
    const output = document.getElementById(outputId);

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        if (!file.type.startsWith("image/")) {
            alert("Please upload a valid image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const maxSize = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const resizedImage = canvas.toDataURL("image/jpeg");
                output.src = resizedImage; 
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}