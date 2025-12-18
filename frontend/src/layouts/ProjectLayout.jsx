// // src/layouts/ProjectLayout.jsx

// import { useEffect, useState } from "react";
// import { Outlet, useParams, Link, useNavigate } from "react-router-dom";
// import api from "@/api";
// import ProjectSidebar from "@/components/ProjectSidebar.jsx";



// export default function ProjectLayout() {
//   const { projectId } = useParams();
//   const navigate = useNavigate();

//   const [project, setProject] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const fetchProject = async () => {
//     try {
//       const res = await api.get(`/projects/${projectId}`);
//       setProject(res.data.data);
//       setLoading(false);
//     } catch (error) {
//       setLoading(false);
//       navigate("/projects/create");
//     }
//   };

//   useEffect(() => {
//     fetchProject();
//   }, [projectId]);

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center w-full h-screen text-xl">
//         Loading project...
//       </div>
//     );
//   }

//   if (!project) {
//     return (
//       <div className="p-10">
//         <p className="text-red-500">Project not found.</p>
//         <Link to="/projects/create" className="text-blue-500 underline">
//           Create new project
//         </Link>
//       </div>
//     );
//   }

//   return (
//     <div className="flex w-full min-h-screen bg-gray-100">
//       <ProjectSidebar projectId={projectId} project={project} />

//       <main className="flex-1 p-8 overflow-y-auto">
//         <Outlet context={{ project }} />
//       </main>
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import api from "@/api";
import ProjectSidebar from "@/components/ProjectSidebar";

export default function ProjectLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(`/api/projects/${projectId}`);
        setProject(res.data.data);
      } catch (err) {
        console.error("Failed to load project", err);
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-red-500">
        Project not found
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <ProjectSidebar
        projects={[project]} // workspace sidebar can be expanded later
        activeProject={project}
        onSelectProject={() => {}}
        onCreateProject={() => navigate("/projects/create")}
      />

      {/* Main content */}
      <div className="flex-1 bg-gray-50 p-6 overflow-auto">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
}

