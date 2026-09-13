import { currentUser } from './auth';
export const getAuth = () => ({ currentUser: currentUser() });
