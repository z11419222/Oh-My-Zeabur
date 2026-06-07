// jsdom has no canvas implementation; Semi UI eagerly imports lottie-web which
// touches a 2d context at module load. Provide a minimal stub so component tests
// can import Semi UI without pulling in the native `canvas` dependency.
const stubContext = {
  fillStyle: '',
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fill: () => {},
  measureText: () => ({ width: 0 }),
  scale: () => {},
  rotate: () => {},
  translate: () => {},
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => stubContext,
  writable: true,
})
