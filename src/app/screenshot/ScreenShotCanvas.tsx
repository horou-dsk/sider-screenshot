type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function ScreenShotCanvas(props: { rect: Rect }) {
  const { rect } = props;
  return (
    <div class="fixed z-10" style={{ top: rect.y + "px", left: rect.x + "px" }}>
      <canvas></canvas>
    </div>
  );
}

export default ScreenShotCanvas;
