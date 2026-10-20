import { redirect } from "next/navigation"

/** Legacy URL — registration work happens at the Registration Desk service point. */
export default function RegistrationDepartmentRedirect() {
  redirect("/registration")
}
