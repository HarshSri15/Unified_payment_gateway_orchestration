import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Step1ProjectInfo from "./Step1ProjectInfo";
import Step2GatewayConfig from "./Step2GatewayConfig";
import Step3GstInfo from "./Step3GstInfo";
import api from "@/api"; // IMPORTANT: use unified api

export default function CreateProjectWizard() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [showGstModal, setShowGstModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    callbacks: {
      successUrl: "",
      failureUrl: "",
      webhookUrl: "",
    },
    environment: "test",
    gateways: {},
    gstInfo: null,
  });

  // -----------------------------------
  // Helpers
  // -----------------------------------
  const updateProjectData = (data) => {
    setProjectData((prev) => ({ ...prev, ...data }));
  };

  // -----------------------------------
  // FINAL SUBMIT
  // -----------------------------------
  const handleSubmitFinal = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Normalize gateways for backend
      const gatewayConfigs = {};
      Object.entries(projectData.gateways).forEach(([key, value]) => {
        if (value?.enabled) {
          gatewayConfigs[key.toLowerCase()] = {
            enabled: true,
            config: value.config || {},
          };
        }
      });

      const payload = {
        name: projectData.name.trim(),
        description: projectData.description || "",
        environment: projectData.environment,
        callbacks: projectData.callbacks,
        gateways: gatewayConfigs,
        gstInfo: projectData.gstInfo || null,
      };

      console.log("🚀 Creating project:", payload);

      const res = await api.post("/api/projects", payload);

      const createdProject = res.data?.data?.project;
      if (!createdProject?._id) {
        throw new Error("Project ID missing in response");
      }

      // ✅ CRITICAL: redirect to ProjectsHub child route
      navigate(`/projects/${createdProject._id}`, { replace: true });
    } catch (err) {
      console.error("❌ Project creation failed:", err);
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to create project"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------
  // STEP HANDLERS
  // -----------------------------------
  const handleNextFromStep2 = () => {
    const enabledGateways = Object.values(projectData.gateways).filter(
      (g) => g?.enabled
    );

    if (enabledGateways.length === 0) {
      alert("Please enable at least one payment gateway");
      return;
    }

    setShowGstModal(true);
  };

  const handleGstChoice = (choice) => {
    setShowGstModal(false);

    if (choice === "yes") {
      setStep(3);
    } else {
      handleSubmitFinal();
    }
  };

  // -----------------------------------
  // UI
  // -----------------------------------
  return (
    <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        {step === 1 && (
          <Step1ProjectInfo
            data={projectData}
            update={updateProjectData}
            next={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2GatewayConfig
            data={projectData}
            update={updateProjectData}
            next={handleNextFromStep2}
            back={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3GstInfo
            data={projectData}
            update={updateProjectData}
            finish={handleSubmitFinal}
            back={() => setStep(2)}
          />
        )}
      </div>

      {/* GST CONFIRM MODAL */}
      {showGstModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[380px] p-8 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-semibold mb-2">
              Generate GST Invoice?
            </h2>

            <p className="text-gray-600 text-sm mb-6">
              Do you want to enable GST invoicing for this project?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleGstChoice("no")}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                disabled={submitting}
              >
                No
              </button>
              <button
                onClick={() => handleGstChoice("yes")}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900"
                disabled={submitting}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
