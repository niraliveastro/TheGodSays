export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "any", type: "image/png" }],
  },
};

export default function AuthLayout({ children }) {
  return <>{children}</>;
}
