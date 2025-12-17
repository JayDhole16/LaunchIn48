import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProjectCreationForm from "@/components/project-creation-form"

export default async function CreateProjectPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/services")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ready to Launch Your Project?</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Fill out the form below and our team will get started on your project within 48 hours. We'll keep you
            updated every step of the way.
          </p>
        </div>

        <ProjectCreationForm />
      </div>
    </div>
  )
}