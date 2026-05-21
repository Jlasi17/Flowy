import { useEffect, useState } from "react";

function ScrollArrow() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(
        window.scrollY / window.innerHeight,
        1
      );
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollDown = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="scroll-indicator"
      onClick={scrollDown}
      style={{
        opacity: 1 - scrollProgress * 1.2,
      }}
    >
      <span className="swipe-text">Swipe</span>
      <span className="arrow">↓</span>
    </div>
  );
}

export default ScrollArrow;