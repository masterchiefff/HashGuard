import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import "../styles/globals.css"; // Assuming you have global styles
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <Component {...pageProps} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default MyApp;