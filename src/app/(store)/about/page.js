import Link from 'next/link';

export const metadata = {
  title: 'Our Story | House Of Ginija',
  description: 'Learn about the heritage, slow-fashion philosophy, and five-year design journey of House Of Ginija.',
};

export default function AboutPage() {
  return (
    <div style={pageStyle} className="animate-fade-in">
      {/* Header Banner */}
      <section className="about-header-section" style={headerSectionStyle}>
        <h1 className="about-title" style={titleStyle}>Our Journey</h1>
        <div style={dividerStyle}></div>
      </section>

      {/* Grid Story Section */}
      <section className="container story-grid">
        <div className="about-text-col" style={textColStyle}>
          <p className="brand-tagline about-tagline" style={taglineStyle}>Timeless Silhouettes</p>
          <h2 className="about-section-title" style={sectionTitleStyle}>Dedicated Couture Craftsmanship</h2>
          <p style={paragraphStyle}>
            Founded in the summer of 2021 as a private bespoke tailoring house, House Of Ginija arose from a singular vision: to create heirloom garments that transcend seasons. Rejecting the frenetic cycles of fast fashion, our brand set out to honor the slow, deliberate methods of historical couture.
          </p>
          <p style={paragraphStyle}>
            Since our founding, we have meticulously drafted every pattern on heavy cardstock, cut every layer of organic silk and cotton by hand, and worked closely with local artisan embroiderers to preserve centuries-old hand-stitching heritage.
          </p>
          <p style={paragraphStyle}>
            We dedicate our collections to the clients who have accompanied us on this journey. Every piece is an archival tribute—crafted in rich pink foils and soft mulberry silken structures—to carry forward our legacy of slow luxury.
          </p>
        </div>
        <div className="about-image-col" style={imageColStyle}>
          <img
            src="/images/story.jpeg"
            alt="Design workspace"
            style={imgStyle}
            loading="lazy"
          />
        </div>
      </section>

      {/* Philosophy Callout */}
      <section className="about-philosophy-section" style={philosophySectionStyle}>
        <div className="container" style={philosophyContainerStyle}>
          <span style={philosophyIconStyle}>❧</span>
          <h3 className="about-philosophy-title" style={philosophyTitleStyle}>&ldquo;Made to Last&rdquo;</h3>
          <p style={philosophyDescStyle}>
            We believe a garment should hold memories. We select only the highest grade of natural, ethically sourced silks, linen, and wool. A House Of Ginija creation is not merely designed for a season; it is made to endure, to be cherished, and to be passed down.
          </p>
        </div>
      </section>

      {/* Master Artisans Section */}
      <section className="container story-grid-reverse">
        <div className="about-image-col" style={imageColStyle}>
          <img
            src="https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80"
            alt="Hand-finishing embroidery"
            style={imgStyle}
            loading="lazy"
          />
        </div>
        <div className="about-text-col" style={textColStyle}>
          <span style={sectionSubStyle}>The Studio</span>
          <h2 className="about-section-title" style={sectionTitleStyle}>Hand-Finished Heritage</h2>
          <p style={paragraphStyle}>
            Located in our flagship studio, our tailors and pattern makers bring decades of combined experience. By maintaining an in-house studio, we control the entire lifecycle of our garments—ensuring living wages, zero waste through custom sizing, and a level of execution that machine-made garments can never replicate.
          </p>
          <p style={paragraphStyle}>
            Thank you for being part of our narrative. We invite you to explore our collections and experience the touch of handmade couture.
          </p>
          <Link href="/collections" style={ctaBtnStyle}>
            Browse Our Creations
          </Link>
        </div>
      </section>
    </div>
  );
}

// Inline styles for About Page
const pageStyle = {
  backgroundColor: '#FBF0EC', // Warm Ivory
  paddingBottom: '6rem',
};

const headerSectionStyle = {
  textAlign: 'center',
  padding: '5rem 1rem 3rem 1rem',
};

const subHeaderStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#000000',
  fontWeight: '600',
  display: 'block',
  marginBottom: '0.5rem',
};

const titleStyle = {
  fontSize: '2.8rem',
  fontFamily: 'var(--font-serif)',
  color: '#D98E9B',
  fontWeight: '400',
};

const dividerStyle = {
  width: '60px',
  height: '1px',
  backgroundColor: '#D98E9B',
  margin: '1.2rem auto 0 auto',
};

const textColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.2rem',
};

const taglineStyle = {
  fontSize: '2.4rem',
  marginBottom: '-0.5rem',
};

const sectionSubStyle = {
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#D98E9B',
  fontWeight: '700',
};

const sectionTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '2rem',
  color: '#D98E9B',
  fontWeight: '400',
  lineHeight: 1.3,
};

const paragraphStyle = {
  fontSize: '0.95rem',
  lineHeight: 1.7,
  color: '#000000',
};

const imageColStyle = {
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-md)',
  height: '480px',
  backgroundColor: '#FFFFFF',
};

const imgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const philosophySectionStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '5rem 2rem',
  margin: '5rem 0',
  textAlign: 'center',
};

const philosophyContainerStyle = {
  maxWidth: '750px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1.2rem',
};

const philosophyIconStyle = {
  fontSize: '2rem',
  color: '#000000',
  lineHeight: 1,
};

const philosophyTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '2rem',
  color: '#D98E9B',
  fontWeight: '300',
  letterSpacing: '0.05em',
};

const philosophyDescStyle = {
  fontSize: '1rem',
  lineHeight: 1.7,
  color: '#000000',
  fontWeight: '300',
};

const ctaBtnStyle = {
  alignSelf: 'flex-start',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.8rem 1.8rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginTop: '1rem',
};
