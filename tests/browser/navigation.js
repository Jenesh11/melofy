export const useRouter = () => ({ push: url => { window.fixtureNavigation = url; }, replace: url => { window.fixtureNavigation = url; }, back: () => {} });
export const usePathname = () => location.pathname;
export const useSearchParams = () => new URLSearchParams(location.search);
export const useParams = () => ({});
