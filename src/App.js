import { Camera, StopCircle, Video } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

// We'll need to install and import the following libraries:
// npm install @ffmpeg/ffmpeg @ffmpeg/util
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const App = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [converting, setConverting] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    if (webcamRef.current && webcamRef.current.video) {
      webcamRef.current.video.muted = true;
    }
    load();
  }, []);

  const load = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => console.log(message));
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
  };

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

  const convertToMp4 = async (webmBlob) => {
    const ffmpeg = ffmpegRef.current;
    const inputName = "input.webm";
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
    await ffmpeg.exec(["-i", inputName, outputName]);
    const data = await ffmpeg.readFile(outputName);
    const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
    return mp4Blob;
  };

  useEffect(() => {
    if (recordedChunks.length > 0 && !capturing) {
      const saveVideo = async () => {
        setConverting(true);
        const webmBlob = new Blob(recordedChunks, { type: "video/webm" });
        try {
          const mp4Blob = await convertToMp4(webmBlob);
          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement("a");
          document.body.appendChild(a);
          a.style = "display: none";
          a.href = url;
          a.download = `recording_${Date.now()}.mp4`;
          a.click();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error converting video:", error);
        }
        setConverting(false);
        setRecordedChunks([]);
      };
      saveVideo();
    }
  }, [recordedChunks, capturing]);

  return (
    <div className="flex  items-center justify-center min-h-screen  bg-gray-800">
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
          ) : converting ? (
            <button
              disabled
              className="px-4 py-2 text-white bg-yellow-500 rounded"
            >
              Converting to MP4...
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
