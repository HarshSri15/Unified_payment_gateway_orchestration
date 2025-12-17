import { useState } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";

export default function CreateProjectStart() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Please enter a project name");
      return;
    }

    try {
      setLoading(true);

      // ❗ FIXED: corrected API route
      const res = await axios.post("/api/projects/simple-create", {
        name: name.trim(),
      });

      console.log("Project created:", res.data);

      if (res.data?.projectId) {
        navigate(`/project/${res.data.projectId}/dashboard`);
      } else {
        alert("Something went wrong.");
      }
    } catch (err) {
      console.error("Create project error:", err);
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Create Project
        </h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Continue →"}
        </button>
      </div>
    </div>
  );
}
