import html2canvas from "html2canvas";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Shell from "../../components/Shell";
import { useTheme } from "../../components/ThemeContext";

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const FIXED_CATEGORIES = [
  "Sofa",
  "Bed",
  "Chair",
  "Table",
  "Lamp",
  "Cabinet",
  "Other",
];

const DEFAULT_ITEM_SIZE = 120;

export default function VirtualFurniturePage() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const roomRef = useRef(null);
  const roomUrlRef = useRef("");
  const pinchStateRef = useRef(null);

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [placedItems, setPlacedItems] = useState([]);
  const placedItemsRef = useRef(placedItems);

  const [selectedPlacedId, setSelectedPlacedId] = useState(null);
  const [dragging, setDragging] = useState(null);

  const [roomImage, setRoomImage] = useState("");
  const [roomPathInput, setRoomPathInput] = useState("/room-images/bedroom1.jpg");

  const [catalogFilter, setCatalogFilter] = useState("all");
  const [catalogSearch, setCatalogSearch] = useState("");

  const [toast, setToast] = useState("");
  
  // Saved room images state
  const [savedRoomImages, setSavedRoomImages] = useState([]);
  const [loadingSavedImages, setLoadingSavedImages] = useState(false);
  const [showSavedImagesModal, setShowSavedImagesModal] = useState(false);
  const [savingRoomImage, setSavingRoomImage] = useState(false);
  const [roomImageName, setRoomImageName] = useState("");
  const [editingImageId, setEditingImageId] = useState(null);
  const [editingImageName, setEditingImageName] = useState("");

  const axiosErr = (e, fallback) =>
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    fallback;

  const loadFurniture = async () => {
    setLoadingCatalog(true);
    try {
      const res = await api.get("furniture/");
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];
      setCatalog(list);
    } catch (e) {
      setToast(axiosErr(e, "Failed to load furniture."));
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadSavedRoomImages = async () => {
    setLoadingSavedImages(true);
    try {
      const res = await api.get("tenant/virtual-furniture/room-images/");
      setSavedRoomImages(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (e) {
      console.error("Failed to load saved room images:", axiosErr(e, ""));
    } finally {
      setLoadingSavedImages(false);
    }
  };

  useEffect(() => {
    loadFurniture();
    loadSavedRoomImages();
  }, []);

  useEffect(() => {
    placedItemsRef.current = placedItems;
  }, [placedItems]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (roomUrlRef.current) {
        URL.revokeObjectURL(roomUrlRef.current);
      }
    };
  }, []);

  // Save current room layout as image
  const saveRoomLayout = async () => {
    if (!roomImage) {
      setToast("Please upload a room image first.");
      return;
    }

    if (!roomImageName.trim()) {
      setToast("Please enter a name for this room layout.");
      return;
    }

    setSavingRoomImage(true);
    try {
      // Capture the room preview area with all furniture
      if (!roomRef.current) {
        setToast("Room preview not available.");
        return;
      }

      const canvas = await html2canvas(roomRef.current, {
        backgroundColor: null,
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setToast("Failed to capture room image.");
          return;
        }

        try {
          const formData = new FormData();
          formData.append("image", blob, `${roomImageName.trim()}.png`);
          formData.append("image_name", roomImageName.trim());

          // Include furniture layout data as JSON
          const layoutData = {
            roomImage: roomImage,
            placedItems: placedItems,
            createdAt: new Date().toISOString(),
          };
          formData.append("layout_data", JSON.stringify(layoutData));

          const res = await api.post(
            "tenant/virtual-furniture/room-images/",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          setSavedRoomImages((prev) => [res.data, ...prev]);
          setRoomImageName("");
          setToast(`Room layout saved as "${roomImageName.trim()}" with ${placedItems.length} furniture items`);
        } catch (e) {
          setToast(axiosErr(e, "Failed to save room image."));
        } finally {
          setSavingRoomImage(false);
        }
      });
    } catch (e) {
      setToast(axiosErr(e, "Failed to capture room layout."));
      setSavingRoomImage(false);
    }
  };

  // Load a saved room image
  const loadSavedRoomImage = (savedImage) => {
    try {
      // Check if layout data exists (new format with furniture)
      if (savedImage.layout_data) {
        const layoutData = JSON.parse(savedImage.layout_data);
        setRoomImage(layoutData.roomImage);
        setPlacedItems(layoutData.placedItems || []);
        setToast(`Loaded room layout: "${savedImage.image_name}" with ${layoutData.placedItems?.length || 0} furniture items`);
      } else {
        // Legacy format - just load the room image
        setRoomImage(savedImage.image);
        setPlacedItems([]);
        setToast(`Loaded room layout: "${savedImage.image_name}"`);
      }
      setSelectedPlacedId(null);
      setShowSavedImagesModal(false);
    } catch (e) {
      console.error("Error loading saved room layout:", e);
      // Fallback to legacy loading
      setRoomImage(savedImage.image);
      setPlacedItems([]);
      setSelectedPlacedId(null);
      setShowSavedImagesModal(false);
      setToast(`Loaded room layout: "${savedImage.image_name}"`);
    }
  };

  // Delete a saved room image
  const deleteSavedRoomImage = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this saved room layout?")) {
      return;
    }

    try {
      await api.delete(`tenant/virtual-furniture/room-images/${imageId}/`);
      setSavedRoomImages((prev) => prev.filter((img) => img.id !== imageId));
      setToast("Room layout deleted successfully.");
    } catch (e) {
      setToast(axiosErr(e, "Failed to delete room image."));
    }
  };

  // Start editing room image name
  const startEditingImageName = (imageId, currentName) => {
    setEditingImageId(imageId);
    setEditingImageName(currentName);
  };

  // Update room image name
  const updateRoomImageName = async (imageId) => {
    if (!editingImageName.trim()) {
      setToast("Please enter a valid name.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image_name", editingImageName.trim());

      const res = await api.put(
        `tenant/virtual-furniture/room-images/${imageId}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSavedRoomImages((prev) =>
        prev.map((img) => (img.id === imageId ? res.data : img))
      );
      setEditingImageId(null);
      setEditingImageName("");
      setToast("Room layout name updated.");
    } catch (e) {
      setToast(axiosErr(e, "Failed to update room image name."));
    }
  };

  const selectedPlacedItem = useMemo(
    () => placedItems.find((item) => item.instanceId === selectedPlacedId) || null,
    [placedItems, selectedPlacedId]
  );

  const categories = useMemo(() => {
    const existing = new Set(catalog.map((item) => item.category).filter(Boolean));
    FIXED_CATEGORIES.forEach((cat) => existing.add(cat));
    return [
      "all",
      ...FIXED_CATEGORIES,
      ...Array.from(existing).filter((cat) => !FIXED_CATEGORIES.includes(cat)),
    ];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();

    return catalog.filter((item) => {
      const passCategory =
        catalogFilter === "all" || item.category === catalogFilter;

      const searchable = [
        item.name,
        item.category,
        item.furniture_type,
        item.color,
      ]
        .join(" ")
        .toLowerCase();

      const passSearch = !q || searchable.includes(q);

      return passCategory && passSearch;
    });
  }, [catalog, catalogFilter, catalogSearch]);

  const getRoomRect = () => {
    const rect = roomRef.current?.getBoundingClientRect();
    return {
      width: rect?.width || 900,
      height: rect?.height || 620,
    };
  };

  const getRoomPoint = (clientX, clientY) => {
    const rect = roomRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 450, y: 310, width: 900, height: 620 };
    }

    return {
      x: clamp(clientX - rect.left, 0, rect.width),
      y: clamp(clientY - rect.top, 0, rect.height),
      width: rect.width,
      height: rect.height,
    };
  };

  const nextZ = () => {
    const current = placedItemsRef.current;
    if (!current.length) return 1;
    return Math.max(...current.map((item) => item.z || 1)) + 1;
  };

  const getVisualScale = (item) => {
    const { height } = getRoomRect();
    if (!item.autoDepth) return 1;
    const scale = 0.72 + (item.y / Math.max(height, 1)) * 0.55;
    return clamp(scale, 0.7, 1.35);
  };

  const fitPlacedItemInsideRoom = (item) => {
    const { width: roomWidth, height: roomHeight } = getRoomRect();
    const scale = getVisualScale(item);
    const visualWidth = item.width * scale;
    const visualHeight = item.height * scale;

    const halfW = visualWidth / 2;
    const halfH = visualHeight / 2;

    return {
      ...item,
      x: clamp(item.x, halfW, roomWidth - halfW),
      y: clamp(item.y, halfH, roomHeight - halfH),
    };
  };

  const handleUploadRoomFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    if (roomUrlRef.current) {
      URL.revokeObjectURL(roomUrlRef.current);
    }

    roomUrlRef.current = url;
    setRoomImage(url);
    setSelectedPlacedId(null);
    setToast("Room image loaded from your device.");
  };

  const applyRoomImagePath = () => {
    const value = roomPathInput.trim();
    if (!value) {
      setToast("Please enter a room image path.");
      return;
    }

    if (roomUrlRef.current) {
      URL.revokeObjectURL(roomUrlRef.current);
      roomUrlRef.current = "";
    }

    setRoomImage(value);
    setSelectedPlacedId(null);
    setToast("Room image loaded from path.");
  };

  const removeRoomImage = () => {
    if (roomUrlRef.current) {
      URL.revokeObjectURL(roomUrlRef.current);
      roomUrlRef.current = "";
    }

    setRoomImage("");
    setPlacedItems([]);
    setSelectedPlacedId(null);
    setToast("Room image deleted and placed furniture cleared.");
  };

  const addFurnitureToRoom = (catalogItem, x, y) => {
    const { width: roomWidth, height: roomHeight } = getRoomRect();

    const img = catalogItem.image_url || catalogItem.image || "/no-image.png";

    const itemWidth = clamp(Number(catalogItem.width) || DEFAULT_ITEM_SIZE, 50, 500);
    const itemHeight = clamp(Number(catalogItem.height) || DEFAULT_ITEM_SIZE, 50, 500);

    const safeX = clamp(x, itemWidth / 2, roomWidth - itemWidth / 2);
    const safeY = clamp(y, itemHeight / 2, roomHeight - itemHeight / 2);

    const placedItem = {
      instanceId: makeId("placed"),
      catalogId: catalogItem.id,
      name: catalogItem.name,
      image: img,
      x: safeX,
      y: safeY,
      width: itemWidth,
      height: itemHeight,
      rotation: 0,
      z: nextZ(),
      opacity: 1,
      autoDepth: true,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
      shadowStrength: 0.35,
    };

    const fitted = fitPlacedItemInsideRoom(placedItem);

    setPlacedItems((prev) => [...prev, fitted]);
    setSelectedPlacedId(fitted.instanceId);
    setToast(`${catalogItem.name} added to room.`);
  };

  const addFurnitureToCenter = (catalogItem) => {
    const { width, height } = getRoomRect();
    addFurnitureToRoom(catalogItem, width / 2, height / 2);
  };

  const duplicateSelectedFurniture = () => {
    if (!selectedPlacedItem) return;

    const newItem = fitPlacedItemInsideRoom({
      ...selectedPlacedItem,
      instanceId: makeId("placed"),
      x: selectedPlacedItem.x + 30,
      y: selectedPlacedItem.y + 30,
      z: nextZ(),
    });

    setPlacedItems((prev) => [...prev, newItem]);
    setSelectedPlacedId(newItem.instanceId);
    setToast("Furniture duplicated.");
  };

  const deleteSelectedPlacedItem = () => {
    if (!selectedPlacedId) return;

    setPlacedItems((prev) =>
      prev.filter((item) => item.instanceId !== selectedPlacedId)
    );
    setSelectedPlacedId(null);
    setToast("Placed furniture deleted.");
  };

  const clearAllFurniture = () => {
    setPlacedItems([]);
    setSelectedPlacedId(null);
    setToast("All placed furniture cleared.");
  };

  const bringSelectedToFront = () => {
    if (!selectedPlacedId) return;
    updateSelectedPlacedItem({ z: nextZ() });
  };

  const sendSelectedBackward = () => {
    if (!selectedPlacedItem) return;
    updateSelectedPlacedItem({ z: Math.max(1, selectedPlacedItem.z - 1) });
  };

  const resetSelectedCrop = () => {
    if (!selectedPlacedItem) return;
    updateSelectedPlacedItem({
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
    });
  };

  const handleCatalogDragStart = (e, itemId) => {
    e.dataTransfer.setData("application/catalog-item-id", String(itemId));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleRoomDrop = (e) => {
    e.preventDefault();

    const itemId = e.dataTransfer.getData("application/catalog-item-id");
    if (!itemId) return;

    const catalogItem = catalog.find((item) => String(item.id) === String(itemId));
    if (!catalogItem) return;

    const point = getRoomPoint(e.clientX, e.clientY);
    addFurnitureToRoom(catalogItem, point.x, point.y);
  };

  const handleRoomDragOver = (e) => {
    e.preventDefault();
  };

  const startDraggingPlacedItem = (e, instanceId) => {
    e.stopPropagation();

    const point = getRoomPoint(e.clientX, e.clientY);
    const currentItem = placedItemsRef.current.find(
      (item) => item.instanceId === instanceId
    );
    if (!currentItem) return;

    setSelectedPlacedId(instanceId);

    setPlacedItems((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId ? { ...item, z: nextZ() } : item
      )
    );

    setDragging({
      instanceId,
      offsetX: point.x - currentItem.x,
      offsetY: point.y - currentItem.y,
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e) => {
      const point = getRoomPoint(e.clientX, e.clientY);

      setPlacedItems((prev) =>
        prev.map((item) => {
          if (item.instanceId !== dragging.instanceId) return item;

          const scale = getVisualScale(item);
          const halfW = (item.width * scale) / 2;
          const halfH = (item.height * scale) / 2;

          const newX = clamp(point.x - dragging.offsetX, halfW, point.width - halfW);
          const newY = clamp(point.y - dragging.offsetY, halfH, point.height - halfH);

          return {
            ...item,
            x: newX,
            y: newY,
          };
        })
      );
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging]);

  const updatePlacedItemById = (instanceId, patch) => {
    setPlacedItems((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;
        const updated = fitPlacedItemInsideRoom({ ...item, ...patch });
        return updated;
      })
    );
  };

  const updateSelectedPlacedItem = (patch) => {
    if (!selectedPlacedId) return;
    updatePlacedItemById(selectedPlacedId, patch);
  };

  const moveSelectedBy = (dx, dy) => {
    if (!selectedPlacedItem) return;
    updateSelectedPlacedItem({
      x: selectedPlacedItem.x + dx,
      y: selectedPlacedItem.y + dy,
    });
  };

  const resizeSelected = (delta) => {
    if (!selectedPlacedItem) return;

    const { width: roomWidth, height: roomHeight } = getRoomRect();

    const newWidth = clamp(
      selectedPlacedItem.width + delta,
      40,
      Math.min(700, roomWidth - 10)
    );
    const newHeight = clamp(
      selectedPlacedItem.height + delta,
      40,
      Math.min(700, roomHeight - 10)
    );

    updateSelectedPlacedItem({
      width: newWidth,
      height: newHeight,
    });
  };

  const resizePlacedItemFromWheel = (instanceId, deltaY) => {
    const item = placedItemsRef.current.find((x) => x.instanceId === instanceId);
    if (!item) return;

    const { width: roomWidth, height: roomHeight } = getRoomRect();
    const step = deltaY > 0 ? -10 : 10;

    const newWidth = clamp(item.width + step, 40, Math.min(700, roomWidth - 10));
    const newHeight = clamp(item.height + step, 40, Math.min(700, roomHeight - 10));

    updatePlacedItemById(instanceId, {
      width: newWidth,
      height: newHeight,
    });
  };

  const handlePlacedWheel = (e, instanceId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlacedId(instanceId);
    resizePlacedItemFromWheel(instanceId, e.deltaY);
  };

  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePlacedTouchStart = (e, instanceId) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      setSelectedPlacedId(instanceId);

      const item = placedItemsRef.current.find((x) => x.instanceId === instanceId);
      if (!item) return;

      pinchStateRef.current = {
        instanceId,
        startDistance: getTouchDistance(e.touches),
        startWidth: item.width,
        startHeight: item.height,
      };
    }
  };

  const handlePlacedTouchMove = (e, instanceId) => {
    if (e.touches.length !== 2) return;
    if (!pinchStateRef.current) return;
    if (pinchStateRef.current.instanceId !== instanceId) return;

    e.preventDefault();
    e.stopPropagation();

    const { width: roomWidth, height: roomHeight } = getRoomRect();

    const currentDistance = getTouchDistance(e.touches);
    const ratio = currentDistance / pinchStateRef.current.startDistance;

    const newWidth = clamp(
      pinchStateRef.current.startWidth * ratio,
      40,
      Math.min(700, roomWidth - 10)
    );
    const newHeight = clamp(
      pinchStateRef.current.startHeight * ratio,
      40,
      Math.min(700, roomHeight - 10)
    );

    updatePlacedItemById(instanceId, {
      width: newWidth,
      height: newHeight,
    });
  };

  const handlePlacedTouchEnd = () => {
    pinchStateRef.current = null;
  };

  const setSelectedWidth = (value) => {
    if (!selectedPlacedItem) return;
    const { width: roomWidth } = getRoomRect();

    updateSelectedPlacedItem({
      width: clamp(Number(value) || 40, 40, Math.min(700, roomWidth - 10)),
    });
  };

  const setSelectedHeight = (value) => {
    if (!selectedPlacedItem) return;
    const { height: roomHeight } = getRoomRect();

    updateSelectedPlacedItem({
      height: clamp(Number(value) || 40, 40, Math.min(700, roomHeight - 10)),
    });
  };

  const rotateSelected = (delta) => {
    if (!selectedPlacedItem) return;

    updateSelectedPlacedItem({
      rotation: (selectedPlacedItem.rotation + delta + 360) % 360,
    });
  };

  const setSelectedCrop = (key, value) => {
    if (!selectedPlacedItem) return;
    updateSelectedPlacedItem({
      [key]: clamp(Number(value) || 0, 0, 45),
    });
  };

  const getPlacedImageStyle = (item) => {
    const widthBoost = item.cropLeft + item.cropRight;
    const heightBoost = item.cropTop + item.cropBottom;

    return {
      position: "absolute",
      left: `-${item.cropLeft}%`,
      top: `-${item.cropTop}%`,
      width: `${100 + widthBoost}%`,
      height: `${100 + heightBoost}%`,
      objectFit: "contain",
      opacity: item.opacity,
      filter: `drop-shadow(0 16px 24px rgba(0,0,0,${item.shadowStrength}))`,
      userSelect: "none",
      pointerEvents: "none",
    };
  };

  const panelClass = isDark
    ? "rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
    : "rounded-[28px] border border-slate-200 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)]";

  const softCardClass = isDark
    ? "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
    : "rounded-3xl border border-slate-200 bg-slate-50/90 backdrop-blur-xl";

  const inputClass = isDark
    ? "w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/10"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";

  const subtleButtonClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]"
    : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

  const pageBgClass = isDark
    ? "min-h-screen rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.10),_transparent_24%),linear-gradient(180deg,_#071120_0%,_#020617_100%)] p-3 text-white"
    : "min-h-screen rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_26%),radial-gradient(circle_at_right,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] p-3 text-slate-900";

  return (
    <Shell
      title="Virtual Furniture Planner"
      subtitle="Upload a room image, drag shared furniture into the scene, and adjust each item with resize, crop, depth, and rotation controls."
      right={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSavedImagesModal(true)}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
              isDark
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            📷 View Saved ({savedRoomImages.length})
          </button>

          <button
            onClick={() => nav("/tenant")}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
              isDark
                ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1]"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            ← Back Dashboard
          </button>

          <button
            onClick={clearAllFurniture}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
              isDark
                ? "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Clear Furniture
          </button>

          <button
            onClick={removeRoomImage}
            disabled={!roomImage}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDark
                ? "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            Delete Room Image
          </button>
        </div>
      }
    >
      <div className={pageBgClass}>
        <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
          <aside className={`${panelClass} p-5`}>
            <div
              className={`mb-5 rounded-3xl border p-5 ${
                isDark
                  ? "border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
                  : "border-blue-200 bg-gradient-to-br from-cyan-50 to-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                      isDark ? "text-cyan-200/90" : "text-sky-700"
                    }`}
                  >
                    Workspace
                  </div>
                  <h2
                    className={`mt-2 text-2xl font-bold tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Room Setup
                  </h2>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Load a room photo, then place furniture visually and refine
                    the scene with clean controls.
                  </p>
                </div>
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl ${
                    isDark
                      ? "border-white/10 bg-white/10 shadow-lg shadow-cyan-950/30"
                      : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  🛋️
                </div>
              </div>
            </div>

            <div className={`${softCardClass} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Room Image
                  </div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Upload from device or use an image path.
                  </div>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isDark
                      ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                      : "border-cyan-200 bg-cyan-50 text-cyan-700"
                  }`}
                >
                  Step 1
                </div>
              </div>

              <label
                className={`mt-5 flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                  isDark
                    ? "border-dashed border-cyan-400/35 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-100 hover:from-cyan-500/15 hover:to-blue-500/15"
                    : "border-dashed border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 hover:from-sky-100 hover:to-blue-100"
                }`}
              >
                Upload From Device
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadRoomFile}
                  className="hidden"
                />
              </label>

              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  isDark
                    ? "border-white/10 bg-slate-950/30"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Room Image Path
                </div>
                <div className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Put room images inside{" "}
                  <span className={isDark ? "text-cyan-300" : "text-sky-700"}>
                    public/room-images/
                  </span>
                  <br />
                  Example:{" "}
                  <span className={isDark ? "text-cyan-300" : "text-sky-700"}>
                    /room-images/bedroom1.jpg
                  </span>
                </div>

                <input
                  value={roomPathInput}
                  onChange={(e) => setRoomPathInput(e.target.value)}
                  placeholder="/room-images/bedroom1.jpg"
                  className={`${inputClass} mt-3`}
                />

                <button
                  onClick={applyRoomImagePath}
                  className="mt-3 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01]"
                >
                  Use Room Image Path
                </button>
              </div>
            </div>

            <div className={`${softCardClass} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Save Room Layout
                  </div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Capture and save your current room design.
                  </div>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isDark
                      ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }`}
                >
                  Save
                </div>
              </div>

              <input
                value={roomImageName}
                onChange={(e) => setRoomImageName(e.target.value)}
                placeholder="Enter layout name (e.g., 'Living Room - April 2026')"
                className={`${inputClass} mt-4`}
              />

              <button
                onClick={saveRoomLayout}
                disabled={savingRoomImage || !roomImage}
                className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDark
                    ? "border-purple-400/20 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20"
                    : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                {savingRoomImage ? "Saving..." : `💾 Save Layout (${placedItems.length} items)`}
              </button>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Shared Furniture
                  </div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Browse reusable furniture from backend.
                  </div>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    isDark
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  Step 2
                </div>
              </div>

              <div className={`${softCardClass} p-4`}>
                <div className="grid gap-3">
                  <input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search furniture..."
                    className={inputClass}
                  />

                  <select
                    value={catalogFilter}
                    onChange={(e) => setCatalogFilter(e.target.value)}
                    className={inputClass}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : cat}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={loadFurniture}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      isDark
                        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                        : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    Refresh Furniture
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-[760px] space-y-4 overflow-y-auto pr-1">
                {loadingCatalog ? (
                  <div className={`${softCardClass} p-4 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Loading furniture...
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className={`${softCardClass} p-4 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    No furniture found.
                  </div>
                ) : (
                  filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleCatalogDragStart(e, item.id)}
                      className={`group rounded-3xl border p-4 transition hover:-translate-y-1 ${
                        isDark
                          ? "border-white/10 bg-white/[0.04] shadow-[0_12px_30px_rgba(0,0,0,0.18)] hover:border-cyan-400/25 hover:bg-white/[0.06]"
                          : "border-slate-200 bg-white shadow-sm hover:border-sky-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex gap-4">
                        <div
                          className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border p-2 ${
                            isDark
                              ? "border-white/10 bg-slate-950/60 shadow-inner"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <img
                            src={item.image_url || item.image || "/no-image.png"}
                            alt={item.name}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/no-image.png";
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {item.name}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                isDark
                                  ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                                  : "border-cyan-200 bg-cyan-50 text-cyan-700"
                              }`}
                            >
                              {item.category || "Other"}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                isDark
                                  ? "border-white/10 bg-white/5 text-slate-300"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.furniture_type || "Type —"}
                            </span>
                          </div>

                          <div className={`mt-3 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            <div>Color: {item.color || "—"}</div>
                            <div>
                              Size: {item.width || "—"} × {item.height || "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => addFurnitureToCenter(item)}
                        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500/90 to-teal-500/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01]"
                      >
                        Add To Room
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <div className={`${panelClass} overflow-hidden p-5`}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        isDark
                          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                          : "border-cyan-200 bg-cyan-50 text-cyan-700"
                      }`}
                    >
                      Preview Workspace
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        isDark
                          ? "border-white/10 bg-white/5 text-slate-300"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      Drag • Drop • Resize
                    </div>
                  </div>
                  <h2
                    className={`mt-3 text-2xl font-bold tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Room Preview Area
                  </h2>
                  <p
                    className={`mt-2 max-w-3xl text-sm leading-6 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Drag furniture from the left panel or click “Add To Room”.
                    Use wheel or pinch to resize. Select any placed item to crop,
                    rotate, duplicate, or move it more naturally inside the room.
                  </p>
                </div>

                {toast && (
                  <div
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${
                      isDark
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 shadow-lg shadow-emerald-950/20"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {toast}
                  </div>
                )}
              </div>

              <div
                ref={roomRef}
                onDrop={handleRoomDrop}
                onDragOver={handleRoomDragOver}
                onClick={() => setSelectedPlacedId(null)}
                className={`relative min-h-[680px] overflow-hidden rounded-[30px] border ${
                  isDark
                    ? "border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_25%),linear-gradient(180deg,_#020617_0%,_#020b1d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    : "border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_25%),linear-gradient(180deg,_#ffffff_0%,_#f4f8ff_100%)]"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] ${
                    isDark ? "opacity-[0.18]" : "opacity-[0.10]"
                  }`}
                />

                {roomImage ? (
                  <img
                    src={roomImage}
                    alt="Room"
                    className="absolute inset-0 h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/no-image.png";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <div
                      className={`flex h-24 w-24 items-center justify-center rounded-[28px] border text-5xl ${
                        isDark
                          ? "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 shadow-2xl shadow-cyan-950/20"
                          : "border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm"
                      }`}
                    >
                      🏠
                    </div>
                    <div
                      className={`mt-6 text-3xl font-bold tracking-tight ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Upload a Room Image
                    </div>
                    <div
                      className={`mt-3 max-w-2xl text-sm leading-7 ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Use a local file upload or type a path like{" "}
                      <span className={isDark ? "text-cyan-300" : "text-sky-700"}>
                        /room-images/bedroom1.jpg
                      </span>{" "}
                      after placing the image inside{" "}
                      <span className={isDark ? "text-cyan-300" : "text-sky-700"}>
                        public/room-images/
                      </span>.
                    </div>

                    <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01]">
                      Choose Room Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadRoomFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="absolute inset-0">
                  {placedItems.map((item) => {
                    const isSelected = item.instanceId === selectedPlacedId;
                    const visualScale = getVisualScale(item);
                    const visualWidth = item.width * visualScale;
                    const visualHeight = item.height * visualScale;
                    const shadowWidth = Math.max(visualWidth * 0.62, 30);
                    const shadowHeight = Math.max(visualHeight * 0.12, 10);

                    return (
                      <div
                        key={item.instanceId}
                        onPointerDown={(e) => startDraggingPlacedItem(e, item.instanceId)}
                        onTouchStart={(e) => handlePlacedTouchStart(e, item.instanceId)}
                        onTouchMove={(e) => handlePlacedTouchMove(e, item.instanceId)}
                        onTouchEnd={handlePlacedTouchEnd}
                        onWheel={(e) => handlePlacedWheel(e, item.instanceId)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlacedId(item.instanceId);
                        }}
                        className={`absolute cursor-move select-none transition ${
                          isSelected ? "z-50" : ""
                        }`}
                        style={{
                          left: item.x,
                          top: item.y,
                          width: visualWidth,
                          height: visualHeight,
                          zIndex: item.z,
                          transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                          touchAction: "none",
                        }}
                        title={`${item.name} - drag to move`}
                      >
                        <div
                          className="absolute left-1/2 top-[90%] -translate-x-1/2 rounded-full bg-black/45 blur-md"
                          style={{
                            width: shadowWidth,
                            height: shadowHeight,
                            opacity: 0.28 + item.shadowStrength * 0.4,
                          }}
                        />

                        <div className="relative h-full w-full">
                          <div
                            className="absolute inset-0 overflow-hidden rounded-2xl"
                            style={{
                              outline: isSelected
                                ? "2px solid rgba(34, 211, 238, 0.95)"
                                : "none",
                              boxShadow: isSelected
                                ? "0 0 0 5px rgba(34, 211, 238, 0.12), 0 18px 40px rgba(0,0,0,0.28)"
                                : "none",
                            }}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              draggable={false}
                              style={getPlacedImageStyle(item)}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/no-image.png";
                              }}
                            />
                          </div>

                          {isSelected && (
                            <>
                              <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-lg" />
                              <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-lg" />
                              <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-lg" />
                              <div className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-lg" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_380px]">
                <div className={`${softCardClass} p-5 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        isDark
                          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                          : "border-cyan-200 bg-cyan-50 text-cyan-700"
                      }`}
                    >
                      Helpful Info
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div
                      className={`rounded-2xl border p-4 ${
                        isDark
                          ? "border-white/10 bg-slate-950/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Project Paths
                      </div>
                      <div className={`mt-3 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <div>
                          Room images folder:
                          <span className={`ml-2 ${isDark ? "text-cyan-300" : "text-sky-700"}`}>
                            public/room-images/
                          </span>
                        </div>
                        <div className="mt-1">
                          Furniture images:
                          <span className={`ml-2 ${isDark ? "text-cyan-300" : "text-sky-700"}`}>
                            media/furniture/
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 ${
                        isDark
                          ? "border-white/10 bg-slate-950/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Quick Tip
                      </div>
                      <div className={`mt-3 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Place the item first, then drag, crop, rotate, and resize
                        it so it matches the natural room perspective.
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${softCardClass} p-5`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Placed Furniture Controls
                      </div>
                      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Select one furniture item to edit it.
                      </div>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        isDark
                          ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200"
                          : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                      }`}
                    >
                      Step 3
                    </div>
                  </div>

                  {!selectedPlacedItem ? (
                    <div
                      className={`mt-4 rounded-2xl border p-5 text-sm leading-6 ${
                        isDark
                          ? "border-dashed border-white/10 bg-slate-950/30 text-slate-400"
                          : "border-dashed border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      Select furniture from the room to move, resize, crop,
                      rotate, duplicate, or delete it.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-white/10 bg-slate-950/40"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {selectedPlacedItem.name}
                        </div>
                        <div className={`mt-2 space-y-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          <div>
                            Position: {Math.round(selectedPlacedItem.x)},{" "}
                            {Math.round(selectedPlacedItem.y)}
                          </div>
                          <div>
                            Width: {Math.round(selectedPlacedItem.width)} px
                          </div>
                          <div>
                            Height: {Math.round(selectedPlacedItem.height)} px
                          </div>
                          <div>Rotation: {selectedPlacedItem.rotation}°</div>
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-cyan-400/15 bg-cyan-500/[0.06]"
                            : "border-cyan-200 bg-cyan-50/80"
                        }`}
                      >
                        <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${
                          isDark ? "text-cyan-200" : "text-cyan-700"
                        }`}>
                          Smooth Size Control
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Width</span>
                              <span>{Math.round(selectedPlacedItem.width)} px</span>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="700"
                              value={selectedPlacedItem.width}
                              onChange={(e) => setSelectedWidth(e.target.value)}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Height</span>
                              <span>{Math.round(selectedPlacedItem.height)} px</span>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="700"
                              value={selectedPlacedItem.height}
                              onChange={(e) => setSelectedHeight(e.target.value)}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Opacity</span>
                              <span>{Math.round(selectedPlacedItem.opacity * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="30"
                              max="100"
                              value={Math.round(selectedPlacedItem.opacity * 100)}
                              onChange={(e) =>
                                updateSelectedPlacedItem({
                                  opacity: clamp(Number(e.target.value) / 100, 0.3, 1),
                                })
                              }
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Shadow</span>
                              <span>
                                {Math.round(selectedPlacedItem.shadowStrength * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round(selectedPlacedItem.shadowStrength * 100)}
                              onChange={(e) =>
                                updateSelectedPlacedItem({
                                  shadowStrength: clamp(
                                    Number(e.target.value) / 100,
                                    0,
                                    1
                                  ),
                                })
                              }
                              className="w-full accent-cyan-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-emerald-400/15 bg-emerald-500/[0.06]"
                            : "border-emerald-200 bg-emerald-50/80"
                        }`}
                      >
                        <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${
                          isDark ? "text-emerald-200" : "text-emerald-700"
                        }`}>
                          Crop Image To Fit Better
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Crop Left</span>
                              <span>{selectedPlacedItem.cropLeft}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="45"
                              value={selectedPlacedItem.cropLeft}
                              onChange={(e) => setSelectedCrop("cropLeft", e.target.value)}
                              className="w-full accent-emerald-400"
                            />
                          </div>

                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Crop Right</span>
                              <span>{selectedPlacedItem.cropRight}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="45"
                              value={selectedPlacedItem.cropRight}
                              onChange={(e) =>
                                setSelectedCrop("cropRight", e.target.value)
                              }
                              className="w-full accent-emerald-400"
                            />
                          </div>

                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Crop Top</span>
                              <span>{selectedPlacedItem.cropTop}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="45"
                              value={selectedPlacedItem.cropTop}
                              onChange={(e) => setSelectedCrop("cropTop", e.target.value)}
                              className="w-full accent-emerald-400"
                            />
                          </div>

                          <div>
                            <div className={`mb-1 flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              <span>Crop Bottom</span>
                              <span>{selectedPlacedItem.cropBottom}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="45"
                              value={selectedPlacedItem.cropBottom}
                              onChange={(e) =>
                                setSelectedCrop("cropBottom", e.target.value)
                              }
                              className="w-full accent-emerald-400"
                            />
                          </div>

                          <button
                            onClick={resetSelectedCrop}
                            className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                              isDark
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            Reset Crop
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => resizeSelected(10)} className={subtleButtonClass}>
                          Size +
                        </button>
                        <button onClick={() => resizeSelected(-10)} className={subtleButtonClass}>
                          Size -
                        </button>
                        <button onClick={() => rotateSelected(15)} className={subtleButtonClass}>
                          Rotate +
                        </button>
                        <button onClick={() => rotateSelected(-15)} className={subtleButtonClass}>
                          Rotate -
                        </button>
                        <button onClick={() => moveSelectedBy(-10, 0)} className={subtleButtonClass}>
                          Move Left
                        </button>
                        <button onClick={() => moveSelectedBy(10, 0)} className={subtleButtonClass}>
                          Move Right
                        </button>
                        <button onClick={() => moveSelectedBy(0, -10)} className={subtleButtonClass}>
                          Move Up
                        </button>
                        <button onClick={() => moveSelectedBy(0, 10)} className={subtleButtonClass}>
                          Move Down
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            updateSelectedPlacedItem({
                              autoDepth: !selectedPlacedItem.autoDepth,
                            })
                          }
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                            isDark
                              ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20"
                              : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
                          }`}
                        >
                          {selectedPlacedItem.autoDepth
                            ? "Auto Depth On"
                            : "Auto Depth Off"}
                        </button>

                        <button
                          onClick={bringSelectedToFront}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                            isDark
                              ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                              : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                          }`}
                        >
                          Bring Front
                        </button>

                        <button
                          onClick={sendSelectedBackward}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                            isDark
                              ? "border-slate-400/20 bg-slate-500/10 text-slate-100 hover:bg-slate-500/20"
                              : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Send Back
                        </button>

                        <button
                          onClick={duplicateSelectedFurniture}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                            isDark
                              ? "border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
                              : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          }`}
                        >
                          Duplicate
                        </button>

                        <button
                          onClick={deleteSelectedPlacedItem}
                          className={`col-span-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                            isDark
                              ? "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Saved Room Images Modal */}
      {showSavedImagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-4xl max-h-[90vh] overflow-auto rounded-3xl border ${
              isDark
                ? "border-white/10 bg-slate-950 shadow-2xl shadow-black/50"
                : "border-slate-200 bg-white shadow-2xl"
            }`}
          >
            <div
              className={`sticky top-0 border-b px-6 py-4 ${
                isDark ? "border-white/10 bg-slate-950/95" : "border-slate-200 bg-white/95"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2
                    className={`text-2xl font-bold tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Saved Room Layouts
                  </h2>
                  <p
                    className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    View, load, update, or delete your saved room designs.
                  </p>
                </div>
                <button
                  onClick={() => setShowSavedImagesModal(false)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingSavedImages ? (
                <div
                  className={`rounded-2xl border p-8 text-center ${
                    isDark
                      ? "border-white/10 bg-slate-900/40"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className={isDark ? "text-slate-400" : "text-slate-500"}>
                    Loading saved layouts...
                  </div>
                </div>
              ) : savedRoomImages.length === 0 ? (
                <div
                  className={`rounded-2xl border p-8 text-center ${
                    isDark
                      ? "border-dashed border-white/10 bg-slate-900/40"
                      : "border-dashed border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="text-4xl mb-3">🏠</div>
                  <div className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    No saved room layouts yet
                  </div>
                  <div className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Create your first room design and save it to see it here.
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {savedRoomImages.map((savedImage) => (
                    <div
                      key={savedImage.id}
                      className={`overflow-hidden rounded-2xl border transition hover:scale-[1.02] ${
                        isDark
                          ? "border-white/10 bg-slate-900/60"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
                        <img
                          src={savedImage.image}
                          alt={savedImage.image_name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/no-image.png";
                          }}
                        />
                      </div>

                      <div className="p-4">
                        {editingImageId === savedImage.id ? (
                          <div className="space-y-2">
                            <input
                              autoFocus
                              value={editingImageName}
                              onChange={(e) => setEditingImageName(e.target.value)}
                              className={inputClass}
                              placeholder="Enter layout name"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  updateRoomImageName(savedImage.id)
                                }
                                className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                                  isDark
                                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingImageId(null)}
                                className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                                  isDark
                                    ? "border-slate-400/20 bg-slate-500/10 text-slate-100 hover:bg-slate-500/20"
                                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`truncate text-base font-semibold ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                              title={savedImage.image_name}
                            >
                              {savedImage.image_name}
                            </div>
                            <div
                              className={`mt-1 text-xs ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              Saved{" "}
                              {new Date(savedImage.created_at).toLocaleDateString()}
                              {savedImage.layout_data && (
                                <span className="ml-2">
                                  •{" "}
                                  {(() => {
                                    try {
                                      const layout = JSON.parse(savedImage.layout_data);
                                      return `${layout.placedItems?.length || 0} items`;
                                    } catch {
                                      return "";
                                    }
                                  })()}
                                </span>
                              )}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => loadSavedRoomImage(savedImage)}
                                className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                                  isDark
                                    ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                                    : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                                }`}
                              >
                                📂 Load
                              </button>
                              <button
                                onClick={() =>
                                  startEditingImageName(
                                    savedImage.id,
                                    savedImage.image_name
                                  )
                                }
                                className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                                  isDark
                                    ? "border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
                                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                              >
                                ✏️ Rename
                              </button>
                              <button
                                onClick={() =>
                                  deleteSavedRoomImage(savedImage.id)
                                }
                                className={`col-span-2 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                                  isDark
                                    ? "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                }`}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
} 