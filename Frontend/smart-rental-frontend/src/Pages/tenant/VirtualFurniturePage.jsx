import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../../components/Shell";
import api from "../../api/axios";

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

  useEffect(() => {
    loadFurniture();
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

    const scale = getVisualScale(currentItem);

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
      scale,
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
      filter: `drop-shadow(0 12px 20px rgba(0,0,0,${item.shadowStrength}))`,
      userSelect: "none",
      pointerEvents: "none",
    };
  };

  return (
    <Shell
      title="Virtual Furniture"
      subtitle="Upload a room image, place furniture visually, resize, crop, and make it fit naturally in the room."
      right={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => nav("/tenant")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Back Dashboard
          </button>

          <button
            onClick={clearAllFurniture}
            className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-500/15"
          >
            Clear Placed Furniture
          </button>

          <button
            onClick={removeRoomImage}
            disabled={!roomImage}
            className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Room Image
          </button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="text-xl font-bold text-white">Room Image</div>
          <div className="mt-2 text-sm text-slate-400">
            You can load a room image in 2 ways.
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-500/10 px-4 py-4 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15">
            Upload From Device
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadRoomFile}
              className="hidden"
            />
          </label>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Room Image Path</div>
            <div className="mt-1 text-xs text-slate-400">
              Put room images inside <span className="text-cyan-300">public/room-images/</span>
              <br />
              Example path: <span className="text-cyan-300">/room-images/bedroom1.jpg</span>
            </div>

            <input
              value={roomPathInput}
              onChange={(e) => setRoomPathInput(e.target.value)}
              placeholder="/room-images/bedroom1.jpg"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
            />

            <button
              onClick={applyRoomImagePath}
              className="mt-3 w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
            >
              Use Room Image Path
            </button>
          </div>

          <div className="mt-6 text-xl font-bold text-white">Shared Furniture List</div>
          <div className="mt-2 text-sm text-slate-400">
            This furniture comes from the backend and is reusable for all tenants.
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="grid gap-3">
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search furniture..."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
              />

              <select
                value={catalogFilter}
                onChange={(e) => setCatalogFilter(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>

              <button
                onClick={loadFurniture}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
              >
                Refresh Furniture
              </button>
            </div>
          </div>

          <div className="mt-5 max-h-[700px] space-y-3 overflow-y-auto pr-1">
            {loadingCatalog ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                Loading furniture...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                No furniture found.
              </div>
            ) : (
              filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleCatalogDragStart(e, item.id)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-2">
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
                      <div className="truncate font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {item.category} • {item.furniture_type || "—"} • {item.color || "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {item.width} × {item.height}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => addFurnitureToCenter(item)}
                      className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/15"
                    >
                      Add To Room
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-bold text-white">Room Preview Area</div>
              <div className="mt-1 text-sm text-slate-400">
                Drag furniture from the list or click Add To Room. Use wheel or pinch to resize. Crop the image to make sofa, bed, cabinet fit more naturally.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {toast && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                  {toast}
                </div>
              )}
            </div>
          </div>

          <div
            ref={roomRef}
            onDrop={handleRoomDrop}
            onDragOver={handleRoomDragOver}
            onClick={() => setSelectedPlacedId(null)}
            className="relative min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
          >
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
                <div className="text-6xl">🏠</div>
                <div className="mt-4 text-2xl font-bold text-white">
                  Upload a Room Image
                </div>
                <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Use a local file upload or type a path like
                  <span className="mx-1 text-cyan-300">/room-images/bedroom1.jpg</span>
                  after placing the image inside the
                  <span className="mx-1 text-cyan-300">public/room-images/</span>
                  folder.
                </div>
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
                    className={`absolute cursor-move select-none ${
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
                      className="absolute left-1/2 top-[90%] -translate-x-1/2 rounded-full bg-black/35 blur-md"
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
                          outline: isSelected ? "2px solid rgba(103, 232, 249, 0.95)" : "none",
                          boxShadow: isSelected
                            ? "0 0 0 4px rgba(34,211,238,0.12)"
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
                          <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400" />
                          <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400" />
                          <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400" />
                          <div className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-cyan-400" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div className="font-semibold text-white">Project Paths</div>
              <div className="mt-2">
                Room images folder:
                <span className="ml-2 text-cyan-300">public/room-images/</span>
              </div>
              <div className="mt-1">
                Furniture images are uploaded from backend and usually stored in:
                <span className="ml-2 text-cyan-300">media/furniture/</span>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Tip: Place the item, drag it into position, then use crop + resize to make it look more realistic in that exact location.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Placed Furniture Controls</div>

              {!selectedPlacedItem ? (
                <div className="mt-3 text-sm text-slate-400">
                  Select furniture from the room to move, resize, crop, rotate, duplicate, or delete it.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold text-white">{selectedPlacedItem.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Position: {Math.round(selectedPlacedItem.x)}, {Math.round(selectedPlacedItem.y)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Width: {Math.round(selectedPlacedItem.width)} px
                    </div>
                    <div className="text-xs text-slate-400">
                      Height: {Math.round(selectedPlacedItem.height)} px
                    </div>
                    <div className="text-xs text-slate-400">
                      Rotation: {selectedPlacedItem.rotation}°
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                      Smooth Size Control
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
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
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
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
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
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
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                          <span>Shadow</span>
                          <span>{Math.round(selectedPlacedItem.shadowStrength * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(selectedPlacedItem.shadowStrength * 100)}
                          onChange={(e) =>
                            updateSelectedPlacedItem({
                              shadowStrength: clamp(Number(e.target.value) / 100, 0, 1),
                            })
                          }
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                      Crop Image To Fit Better
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
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
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                          <span>Crop Right</span>
                          <span>{selectedPlacedItem.cropRight}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="45"
                          value={selectedPlacedItem.cropRight}
                          onChange={(e) => setSelectedCrop("cropRight", e.target.value)}
                          className="w-full accent-emerald-400"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
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
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                          <span>Crop Bottom</span>
                          <span>{selectedPlacedItem.cropBottom}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="45"
                          value={selectedPlacedItem.cropBottom}
                          onChange={(e) => setSelectedCrop("cropBottom", e.target.value)}
                          className="w-full accent-emerald-400"
                        />
                      </div>

                      <button
                        onClick={resetSelectedCrop}
                        className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        Reset Crop
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => resizeSelected(10)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Size +
                    </button>
                    <button
                      onClick={() => resizeSelected(-10)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Size -
                    </button>

                    <button
                      onClick={() => rotateSelected(15)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Rotate +
                    </button>
                    <button
                      onClick={() => rotateSelected(-15)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Rotate -
                    </button>

                    <button
                      onClick={() => moveSelectedBy(-10, 0)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Move Left
                    </button>
                    <button
                      onClick={() => moveSelectedBy(10, 0)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Move Right
                    </button>

                    <button
                      onClick={() => moveSelectedBy(0, -10)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Move Up
                    </button>
                    <button
                      onClick={() => moveSelectedBy(0, 10)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
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
                      className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-sm font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/15"
                    >
                      {selectedPlacedItem.autoDepth ? "Auto Depth On" : "Auto Depth Off"}
                    </button>

                    <button
                      onClick={bringSelectedToFront}
                      className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
                    >
                      Bring Front
                    </button>

                    <button
                      onClick={sendSelectedBackward}
                      className="rounded-xl border border-slate-400/20 bg-slate-500/10 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-500/15"
                    >
                      Send Back
                    </button>

                    <button
                      onClick={duplicateSelectedFurniture}
                      className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/15"
                    >
                      Duplicate
                    </button>

                    <button
                      onClick={deleteSelectedPlacedItem}
                      className="col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
