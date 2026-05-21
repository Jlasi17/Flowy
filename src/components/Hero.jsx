import ScrollArrow from "./ScrollArrow";

function Hero() {
  return (
    <section className="hero">
      <picture style={{ width: "100%", height: "100%", display: "block" }}>
        <source media="(max-width: 768px)" srcSet="/homeimage/opening_mobile.png" />
        <img
          src="/homeimage/opening.webp"
          alt="Hero"
          className="hero-img"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }}
        />
      </picture>
      <ScrollArrow />
    </section>
  );
}

export default Hero;