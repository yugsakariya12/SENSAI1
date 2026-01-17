import { checkUser } from "@/lib/checkUser";
import Header from "./header";

export default async function HeaderServer() {
  const user = await checkUser();
  return <Header user={user} />;
}
