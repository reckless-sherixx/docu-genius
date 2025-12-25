import { useParams } from "next/navigation";

export const useOrganizationId = () => {
  const params = useParams();
  return params.organizationId as string;
};
