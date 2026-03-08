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

export default function VirtualFurniturePage() {
  const nav = useNavigate();
  const roomRef = useRef(null);
  const roomUrlRef = useRef("");

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
    const set = new Set(catalog.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(set)];
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
      height: rect?.height || 560,
    };
  };

  const getRoomPoint = (clientX, clientY) => {
    const rect = roomRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 450, y: 280, width: 900, height: 560 };
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

    const img =
      catalogItem.image_url ||
      catalogItem.image ||
      "/no-image.png";

    const itemWidth = clamp(Number(catalogItem.width) || 120, 40, 500);
    const itemHeight = clamp(Number(catalogItem.height) || 120, 40, 500);

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
    };

    setPlacedItems((prev) => [...prev, placedItem]);
    setSelectedPlacedId(placedItem.instanceId);
    setToast(`${catalogItem.name} added to room.`);
  };

  const addFurnitureToCenter = (catalogItem) => {
    const { width, height } = getRoomRect();
    addFurnitureToRoom(catalogItem, width / 2, height / 2);
  };

  const duplicateSelectedFurniture = () => {
    if (!selectedPlacedItem) return;

    const { width: roomWidth, height: roomHeight } = getRoomRect();

    const newItem = {
      ...selectedPlacedItem,
      instanceId: makeId("placed"),
      x: clamp(
        selectedPlacedItem.x + 30,
        selectedPlacedItem.width / 2,
        roomWidth - selectedPlacedItem.width / 2
      ),
      y: clamp(
        selectedPlacedItem.y + 30,
        selectedPlacedItem.height / 2,
        roomHeight - selectedPlacedItem.height / 2
      ),
      z: nextZ(),
    };

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

          const halfW = item.width / 2;
          const halfH = item.height / 2;

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

  const updateSelectedPlacedItem = (patch) => {
    if (!selectedPlacedId) return;

    setPlacedItems((prev) =>
      prev.map((item) =>
        item.instanceId === selectedPlacedId ? { ...item, ...patch } : item
      )
    );
  };

  const moveSelectedBy = (dx, dy) => {
    if (!selectedPlacedItem) return;

    const { width: roomWidth, height: roomHeight } = getRoomRect();
    const halfW = selectedPlacedItem.width / 2;
    const halfH = selectedPlacedItem.height / 2;

    const newX = clamp(selectedPlacedItem.x + dx, halfW, roomWidth - halfW);
    const newY = clamp(selectedPlacedItem.y + dy, halfH, roomHeight - halfH);

    updateSelectedPlacedItem({ x: newX, y: newY });
  };

  const resizeSelected = (delta) => {
    if (!selectedPlacedItem) return;

    const { width: roomWidth, height: roomHeight } = getRoomRect();

    const newWidth = clamp(
      selectedPlacedItem.width + delta,
      40,
      Math.min(500, roomWidth - 10)
    );
    const newHeight = clamp(
      selectedPlacedItem.height + delta,
      40,
      Math.min(500, roomHeight - 10)
    );

    updateSelectedPlacedItem({
      width: newWidth,
      height: newHeight,
    });
  };

  const rotateSelected = (delta) => {
    if (!selectedPlacedItem) return;

    updateSelectedPlacedItem({
      rotation: (selectedPlacedItem.rotation + delta + 360) % 360,
    });
  };

  return (
    <Shell
      title="Virtual Furniture"
      subtitle="Upload a room image, load shared furniture from backend, and drag furniture into the room."
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
                Drag furniture from the list or click Add To Room.
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

                return (
                  <div
                    key={item.instanceId}
                    onPointerDown={(e) => startDraggingPlacedItem(e, item.instanceId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlacedId(item.instanceId);
                    }}
                    className={`absolute cursor-move select-none ${
                      isSelected ? "ring-2 ring-cyan-300/70" : ""
                    }`}
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      zIndex: item.z,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    }}
                    title={`${item.name} - drag to move`}
                  >
                    <div className="relative h-full w-full rounded-2xl border border-white/10 bg-black/15 shadow-2xl backdrop-blur-sm">
                      <img
                        src={item.image}
                        alt={item.name}
                        draggable={false}
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/no-image.png";
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
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
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Placed Furniture Controls</div>

              {!selectedPlacedItem ? (
                <div className="mt-3 text-sm text-slate-400">
                  Select furniture from the room to move, resize, rotate, duplicate, or delete it.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold text-white">{selectedPlacedItem.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Position: {Math.round(selectedPlacedItem.x)}, {Math.round(selectedPlacedItem.y)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Size: {Math.round(selectedPlacedItem.width)} × {Math.round(selectedPlacedItem.height)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Rotation: {selectedPlacedItem.rotation}°
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
                      onClick={duplicateSelectedFurniture}
                      className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/15"
                    >
                      Duplicate
                    </button>

                    <button
                      onClick={deleteSelectedPlacedItem}
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/15"
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