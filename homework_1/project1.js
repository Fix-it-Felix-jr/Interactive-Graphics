// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
  const bgData = bgImg.data;
  const fgData = fgImg.data;

  const bgWidth = bgImg.width;
  const bgHeight = bgImg.height;
  const fgWidth = fgImg.width;
  const fgHeight = fgImg.height;

  for (let y = 0; y < fgHeight; y++) {
    for (let x = 0; x < fgWidth; x++) {
      const fgX = x;
      const fgY = y;
      const bgX = x + fgPos.x;
      const bgY = y + fgPos.y;

      // Salta se il pixel è fuori dal background
      if (bgX < 0 || bgX >= bgWidth || bgY < 0 || bgY >= bgHeight) {
        continue;
      }

      const fgIndex = (fgY * fgWidth + fgX) * 4;
      const bgIndex = (bgY * bgWidth + bgX) * 4;

      const fgAlpha = fgData[fgIndex + 3] / 255 * fgOpac;
      const invAlpha = 1 - fgAlpha;

      for (let c = 0; c < 3; c++) {
        // RGB blending
        bgData[bgIndex + c] = Math.round(
          fgData[fgIndex + c] * fgAlpha + bgData[bgIndex + c] * invAlpha
        );
      }

      // Alpha channel blending (optional, usually not needed for display)
      bgData[bgIndex + 3] = Math.min(255, Math.round(
        fgAlpha * 255 + bgData[bgIndex + 3] * invAlpha
      ));
    }
  }

  return bgImg;
}

