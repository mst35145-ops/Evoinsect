
export const generateRandomInsectImage = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Clear transparent
    ctx.clearRect(0, 0, 256, 256);

    // Random Properties
    const hue = Math.floor(Math.random() * 360);
    const bodyColor = `hsl(${hue}, 70%, 50%)`;
    const limbColor = `hsl(${hue}, 50%, 30%)`;
    const isRound = Math.random() > 0.5;
    const numLegs = 2 + Math.floor(Math.random() * 4) * 2; // 4, 6, 8, 10
    
    const cx = 128;
    const cy = 128;
    const size = 40 + Math.random() * 30;
    const length = size * (1 + Math.random());

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = limbColor;

    // Draw Legs
    for (let i = 0; i < numLegs/2; i++) {
        const yOffset = (i - (numLegs/4)) * (length / 2);
        
        // Left Leg
        ctx.beginPath();
        ctx.moveTo(cx - size/2, cy + yOffset);
        ctx.lineTo(cx - size * 1.5, cy + yOffset - 20 + Math.random() * 40);
        ctx.lineTo(cx - size * 2.2, cy + yOffset + 20);
        ctx.stroke();

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(cx + size/2, cy + yOffset);
        ctx.lineTo(cx + size * 1.5, cy + yOffset - 20 + Math.random() * 40);
        ctx.lineTo(cx + size * 2.2, cy + yOffset + 20);
        ctx.stroke();
    }

    // Draw Antennae
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - size/3, cy - length/2);
    ctx.quadraticCurveTo(cx - size, cy - length, cx - size * 1.5, cy - length * 1.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + size/3, cy - length/2);
    ctx.quadraticCurveTo(cx + size, cy - length, cx + size * 1.5, cy - length * 1.2);
    ctx.stroke();

    // Draw Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    if (isRound) {
        ctx.ellipse(cx, cy, size, length, 0, 0, Math.PI * 2);
    } else {
        // Segmented
        ctx.ellipse(cx, cy - length/3, size * 0.8, size * 0.8, 0, 0, Math.PI * 2); // Head
        ctx.ellipse(cx, cy, size, length * 0.6, 0, 0, Math.PI * 2); // Thorax
        ctx.ellipse(cx, cy + length/1.5, size * 0.9, length * 0.8, 0, 0, Math.PI * 2); // Abdomen
        ctx.fill();
    }
    ctx.fill();
    
    // Add some spots/stripes
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, size/2, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL('image/png');
};
