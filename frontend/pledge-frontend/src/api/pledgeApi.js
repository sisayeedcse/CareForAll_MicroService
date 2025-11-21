import client from "./client";
export const getPledges = () => client.get("/pledges");
export const getPledge = (id) => client.get(`/pledges/${id}`);
export default { getPledges, getPledge };
