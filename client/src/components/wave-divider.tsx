interface WaveDividerProps {
  fillColor?: string;
}

export function WaveDivider({ fillColor = "#FAF7F2" }: WaveDividerProps) {
  return (
    <div className="w-full overflow-hidden leading-[0] -mb-px">
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="w-full h-[40px] sm:h-[60px] lg:h-[80px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
}
