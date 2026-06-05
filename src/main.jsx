import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "@fontsource/syne/400.css";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./index.css";
createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// Silent fail keeps app stable even if service worker is blocked.
		});
	});
}

if ("serviceWorker" in navigator && import.meta.env.DEV) {
	navigator.serviceWorker.getRegistrations().then((registrations) => {
		registrations.forEach((registration) => registration.unregister());
	});
}
