import client from "./client";
export const getPayments = () => client.get("/payments");
export const getPayment = (id) => client.get(`/payments/${id}`);
export default { getPayments, getPayment };
