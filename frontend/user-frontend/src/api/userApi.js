import client from "./client";
export const getUsers = () => client.get("/users");
export const getUser = (id) => client.get(`/users/${id}`);
export const login = (creds) => client.post("/users/login", creds);
export default { getUsers, getUser, login };
