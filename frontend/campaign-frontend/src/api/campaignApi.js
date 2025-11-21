import client from "./client";

export const getCampaigns = () => client.get("/campaigns");
export const getCampaign = (id) => client.get(`/campaigns/${id}`);

export default { getCampaigns, getCampaign };
