import { Camera, StopCircle, Video } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

const App = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  useEffect(() => {
    if (webcamRef.current && webcamRef.current.video) {
      webcamRef.current.video.muted = true;
    }
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    const byteString = atob(imageSrc.split(",")[1]);
    const mimeString = imageSrc.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `photo_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [webcamRef]);

  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    try {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: "video/webm",
      });
      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        handleDataAvailable
      );
      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Error starting capture:", error);
      setCapturing(false);
    }
  }, [webcamRef, setCapturing, mediaRecorderRef]);

  const handleDataAvailable = useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const handleStopCaptureClick = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setCapturing(false);
  }, [mediaRecorderRef, setCapturing]);

  useEffect(() => {
    if (recordedChunks.length > 0 && !capturing) {
      const blob = new Blob(recordedChunks, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = `recording_${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  }, [recordedChunks, capturing]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full h-full bg-gray-700 bg-opacity-50 backdrop-filter backdrop-blur-sm">
        <Webcam
          audio={true}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-4 p-4 bg-gray-800 bg-opacity-50">
          <button
            onClick={capture}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <Camera className="inline-block mr-2" size={20} />
            Capture photo
          </button>
          {capturing ? (
            <button
              onClick={handleStopCaptureClick}
              className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              <StopCircle className="inline-block mr-2" size={20} />
              Stop Recording
            </button>
          ) : (
            <button
              onClick={handleStartCaptureClick}
              className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <Video className="inline-block mr-2" size={20} />
              Start Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
