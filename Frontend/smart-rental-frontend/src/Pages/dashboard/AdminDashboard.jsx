import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import Shell from "../../components/Shell";
import Toast from "../../components/Toast";
import { useTheme } from "../../components/ThemeContext";
import {
  Users,
  Home,
  CreditCard,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Building2,
  MapPin,
  BadgeDollarSign,
  CheckCircle2,
  XCircle,
  BriefcaseBusiness,
  LayoutDashboard,
  Sofa,
  PanelsTopLeft,
  Send,
  UserCircle2,
  CalendarDays,
  Eye,
  MessageCircle,
  Image as ImageIcon,
  PhoneCall,
  UserRoundSearch,
  BedDouble,
  FileText,
  X,
} from "lucide-react";

function isHtml(x) {
  return typeof x === "string" && x.trim().toLowerCase().includes("<!doctype html");
}

function normalizeRole(r) {
  r = String(r || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  if (r === "service_provider" || r === "serviceprovider") return "provider";
  if (r === "superadmin" || r === "super_admin") return "admin";
  if (r === "user" || r === "customer") return "tenant";
  return r;
}

function safeArr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.owners)) return data.owners;
  if (Array.isArray(data?.tenants)) return data.tenants;
  if (Array.isArray(data?.providers)) return data.providers;
  if (Array.isArray(data?.service_providers)) return data.service_providers;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.listings)) return data.listings;
  if (Array.isArray(data?.broadcasts)) return data.broadcasts;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.communications)) return data.communications;
  if (Array.isArray(data?.threads)) return data.threads;
  return [];
}

async function getFirstWorking(endpoints) {
  let lastErr = null;

  for (const ep of endpoints) {
    try {
      const res = await api.get(ep);
      if (isHtml(res?.data)) throw new Error("API returned HTML (wrong URL)");
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("No endpoint worked");
}

function getUserId(u) {
  return u?.id ?? u?.pk ?? u?.user_id ?? null;
}

function getUserName(u) {
  return u?.username ?? u?.name ?? u?.full_name ?? "-";
}

function getUserEmail(u) {
  return u?.email ?? u?.user_email ?? "-";
}

function getPropertyId(p) {
  return p?.id ?? p?.pk ?? p?.property_id ?? p?.listing_id ?? null;
}

function getPropertyTitle(p) {
  return p?.title ?? p?.property_name ?? p?.listing_title ?? p?.name ?? "Untitled Property";
}

function getPropertyDescription(p) {
  return (
    p?.description ??
    p?.details ??
    p?.content ??
    p?.summary ??
    p?.about ??
    p?.owner_description ??
    "No description available."
  );
}

function getPropertyLocation(p) {
  return (
    p?.location ??
    p?.address ??
    p?.city ??
    p?.area ??
    p?.district ??
    p?.full_address ??
    "N/A"
  );
}

function getPropertyPrice(p) {
  const price = p?.price ?? p?.rent ?? p?.amount ?? p?.monthly_rent;
  return price !== undefined && price !== null && price !== "" ? String(price) : "N/A";
}

function getPropertyOwnerId(p) {
  return p?.owner_id ?? p?.owner?.id ?? p?.user_id ?? p?.landlord_id ?? null;
}

function getPropertyOwnerName(p) {
  return (
    p?.owner_name ??
    p?.owner?.username ??
    p?.owner?.name ??
    p?.username ??
    p?.landlord_name ??
    "N/A"
  );
}

function getPropertyType(p) {
  return p?.property_type ?? p?.type ?? p?.listing_type ?? p?.category ?? "Property";
}

function getPropertyImage(p) {
  return (
    p?.cover_image ||
    p?.image ||
    p?.image_url ||
    p?.photo ||
    p?.thumbnail ||
    p?.primary_image ||
    p?.images?.[0]?.image ||
    p?.images?.[0]?.url ||
    p?.photos?.[0]?.image ||
    p?.photos?.[0]?.url ||
    ""
  );
}

function getPropertyBedrooms(p) {
  return p?.bedrooms ?? p?.beds ?? p?.room_count ?? p?.total_rooms ?? "N/A";
}

function getPropertyBathrooms(p) {
  return p?.bathrooms ?? p?.baths ?? "N/A";
}

function getPropertyArea(p) {
  return p?.area_size ?? p?.size ?? p?.sqft ?? p?.square_feet ?? "N/A";
}

function getPropertyFacilities(p) {
  const raw =
    p?.facilities ??
    p?.amenities ??
    p?.features ??
    p?.services ??
    p?.property_features ??
    [];

  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function getPropertyCreatedDate(p) {
  return p?.created_at ?? p?.posted_at ?? p?.date_created ?? p?.created ?? "N/A";
}

function getBookedStatus(p) {
  if (p?.is_available === false) return true;
  const s = String(
    p?.status ??
    p?.booking_status ??
    p?.property_status ??
    ""
  ).toLowerCase();
  return s === "booked" || s === "occupied" || s === "rented";
}

function formatImageUrl(src) {
  if (!src) return "";
  if (String(src).startsWith("http")) return src;
  if (String(src).startsWith("/")) return src;
  return `/${src}`;
}

function getCommunicationId(c) {
  return c?.id ?? c?.pk ?? c?.message_id ?? c?.thread_id ?? c?.chat_id ?? null;
}

function getCommunicationSender(c) {
  return (
    c?.sender_name ??
    c?.sender?.username ??
    c?.from_name ??
    c?.from ??
    c?.user1_name ??
    c?.tenant_name ??
    c?.participant_one_name ??
    "Unknown sender"
  );
}

function getCommunicationReceiver(c) {
  return (
    c?.receiver_name ??
    c?.receiver?.username ??
    c?.to_name ??
    c?.to ??
    c?.user2_name ??
    c?.owner_name ??
    c?.provider_name ??
    c?.participant_two_name ??
    "Unknown receiver"
  );
}

function getCommunicationSenderRole(c) {
  return normalizeRole(
    c?.sender_role ??
      c?.from_role ??
      c?.user1_role ??
      c?.participant_one_role ??
      c?.role ??
      "user"
  );
}

function getCommunicationReceiverRole(c) {
  return normalizeRole(
    c?.receiver_role ??
      c?.to_role ??
      c?.user2_role ??
      c?.participant_two_role ??
      "user"
  );
}

function getCommunicationDate(c) {
  return c?.created_at ?? c?.sent_at ?? c?.updated_at ?? c?.timestamp ?? c?.date ?? "N/A";
}

function getCommunicationChannel(c) {
  return (
    c?.channel ??
    c?.communication_channel ??
    c?.message_type ??
    c?.mode ??
    "chat"
  );
}

function getConversationType(c) {
  const explicit =
    c?.conversation_type ??
    c?.chat_type ??
    c?.thread_type ??
    c?.type ??
    "";

  const normalizedExplicit = String(explicit).toLowerCase();
  if (normalizedExplicit.includes("roommate")) return "roommate";
  if (normalizedExplicit.includes("owner_provider")) return "owner-provider";
  if (normalizedExplicit.includes("tenant_owner")) return "tenant-owner";
  if (normalizedExplicit.includes("tenant_provider")) return "tenant-provider";

  const a = getCommunicationSenderRole(c);
  const b = getCommunicationReceiverRole(c);

  if (
    normalizedExplicit.includes("roommate") ||
    c?.roommate_request_id ||
    c?.roommate_thread_id
  ) {
    return "roommate";
  }

  if ((a === "tenant" && b === "owner") || (a === "owner" && b === "tenant")) {
    return "tenant-owner";
  }

  if ((a === "owner" && b === "provider") || (a === "provider" && b === "owner")) {
    return "owner-provider";
  }

  if ((a === "tenant" && b === "provider") || (a === "provider" && b === "tenant")) {
    return "tenant-provider";
  }

  if (a === "tenant" && b === "tenant") return "roommate";

  return "general";
}

function roleBadgeClass(role) {
  if (role === "tenant") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (role === "owner") return "bg-blue-50 text-blue-600 border-blue-100";
  if (role === "provider") return "bg-purple-50 text-purple-600 border-purple-100";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function typeBadgeClass(type) {
  if (type === "tenant-owner") return "bg-blue-50 text-blue-700 border-blue-100";
  if (type === "owner-provider") return "bg-purple-50 text-purple-700 border-purple-100";
  if (type === "tenant-provider") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (type === "roommate") return "bg-pink-50 text-pink-700 border-pink-100";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { logout, role } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [toast, setToast] = useState({ type: "info", msg: "" });
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [providers, setProviders] = useState([]);
  const [properties, setProperties] = useState([]);
  const [communications, setCommunications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [communicationLoading, setCommunicationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("owners");

  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedOwnerProperties, setSelectedOwnerProperties] = useState([]);
  const [ownerDetailsLoading, setOwnerDetailsLoading] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState(null);

  const showToast = (type, msg) => setToast({ type, msg });

  const handleLogout = () => {
    logout();
    nav("/super-admin-login-9382", { replace: true });
  };

  const pageBg = isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200";
  const cardBg = isDark
    ? "bg-white/5 border-white/10 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const softCardBg = isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200";
  const mutedText = isDark ? "text-slate-300" : "text-slate-500";
  const headerText = isDark ? "text-white" : "text-slate-900";
  const tableLine = isDark ? "border-white/10" : "border-slate-100";
  const hoverRow = isDark ? "hover:bg-white/10" : "hover:bg-blue-50/30";
  const actionBtnBase = isDark
    ? "bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10"
    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";

  const splitByRole = (list) => {
    const o = [];
    const t = [];
    const p = [];

    for (const u of list || []) {
      const r = normalizeRole(u?.role || u?.user_type || u?.account_type);
      if (r === "owner") o.push(u);
      else if (r === "tenant") t.push(u);
      else if (r === "provider") p.push(u);
    }

    setOwners(o);
    setTenants(t);
    setProviders(p);
  };

  const loadProperties = useCallback(async () => {
    try {
      const propertyData = await getFirstWorking([
        "admin/properties/",
        "admin/properties",
        "admin/listings/",
        "admin/listings",
        "properties/",
        "properties",
        "listings/",
        "listings",
        "public/listings/",
        "public/listings",
      ]);

      const propertyList = safeArr(propertyData);
      setProperties(propertyList);
      return propertyList;
    } catch (e) {
      setProperties([]);
      return [];
    }
  }, []);

  const loadCommunications = useCallback(async () => {
    setCommunicationLoading(true);
    try {
      // ✅ Fetch the unified threads list from our new Admin API
      const res = await api.get("admin/communications/");
      const list = safeArr(res.data);

      setCommunications(list);
      return list;
    } catch (e) {
      console.error("ADMIN_COMMS_ERROR:", e);
      setCommunications([]);
      return [];
    } finally {
      setCommunicationLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setOwners([]);
    setTenants([]);
    setProviders([]);
    setProperties([]);
    setCommunications([]);
    setSelectedOwner(null);
    setSelectedOwnerProperties([]);
    setSelectedProperty(null);
    setToast({ type: "info", msg: "" });

    try {
      const adminData = await getFirstWorking([
        "admin/dashboard-summary/",
        "admin/dashboard-summary",
        "admin/dashboard/",
        "admin/dashboard",
        "admin/users/",
        "admin/users",
      ]);

      if (
        adminData?.owners ||
        adminData?.tenants ||
        adminData?.providers ||
        adminData?.service_providers
      ) {
        setOwners(safeArr(adminData?.owners));
        setTenants(safeArr(adminData?.tenants));
        setProviders(safeArr(adminData?.providers || adminData?.service_providers));

        if (adminData?.properties || adminData?.listings) {
          setProperties(safeArr(adminData?.properties || adminData?.listings));
        } else {
          await loadProperties();
        }
      } else if (Array.isArray(adminData)) {
        splitByRole(adminData);
        await loadProperties();
      } else if (adminData?.results) {
        splitByRole(safeArr(adminData));
        await loadProperties();
      } else {
        const ownersData = await getFirstWorking([
          "admin/owners/",
          "admin/owners",
          "owners/",
          "owners",
        ]);
        const tenantsData = await getFirstWorking([
          "admin/tenants/",
          "admin/tenants",
          "tenants/",
          "tenants",
        ]);
        const providersData = await getFirstWorking([
          "admin/providers/",
          "admin/providers",
          "admin/service-providers/",
          "admin/service-providers",
          "admin/service_providers/",
          "admin/service_providers",
          "providers/",
          "providers",
          "service-providers/",
          "service-providers",
          "service_providers/",
          "service_providers",
        ]);

        setOwners(safeArr(ownersData));
        setTenants(safeArr(tenantsData));
        setProviders(safeArr(providersData));

        await loadProperties();
      }

      await loadCommunications();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to load admin data.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [loadProperties, loadCommunications]);

  useEffect(() => {
    // Only redirect if role exists but is NOT admin
    // If role is empty, we're likely logging out or initializing
    if (role && String(role).toLowerCase() !== "admin") {
      nav("/unauthorized", { replace: true });
      return;
    }
    if (role) loadData();
  }, [role, nav, loadData]);

  const ownerPropertyCountMap = useMemo(() => {
    const map = {};
    for (const owner of owners) {
      map[getUserId(owner)] = 0;
    }
    for (const property of properties) {
      const ownerId = getPropertyOwnerId(property);
      if (ownerId !== null && ownerId !== undefined) {
        map[ownerId] = (map[ownerId] || 0) + 1;
      }
    }
    return map;
  }, [owners, properties]);

  const bookedCount = useMemo(
    () => properties.filter((p) => getBookedStatus(p)).length,
    [properties]
  );

  const availableCount = useMemo(
    () => properties.filter((p) => !getBookedStatus(p)).length,
    [properties]
  );

  const communicationStats = useMemo(() => {
    const stats = {
      total: communications.length,
      roommate: 0,
      tenantOwner: 0,
      ownerProvider: 0,
      tenantProvider: 0,
      general: 0,
    };

    communications.forEach((c) => {
      const type = getConversationType(c);
      if (type === "roommate") stats.roommate += 1;
      else if (type === "tenant-owner") stats.tenantOwner += 1;
      else if (type === "owner-provider") stats.ownerProvider += 1;
      else if (type === "tenant-provider") stats.tenantProvider += 1;
      else stats.general += 1;
    });

    return stats;
  }, [communications]);

  const stats = useMemo(
    () => [
      {
        key: "owners",
        label: "Owners",
        count: owners.length,
        icon: Home,
        iconWrap: isDark ? "bg-blue-500/15" : "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        key: "tenants",
        label: "Tenants",
        count: tenants.length,
        icon: Users,
        iconWrap: isDark ? "bg-emerald-500/15" : "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        key: "providers",
        label: "Providers",
        count: providers.length,
        icon: BriefcaseBusiness,
        iconWrap: isDark ? "bg-purple-500/15" : "bg-purple-50",
        iconColor: "text-purple-600",
      },
      {
        key: "properties",
        label: "Properties",
        count: properties.length,
        icon: Building2,
        iconWrap: isDark ? "bg-orange-500/15" : "bg-orange-50",
        iconColor: "text-orange-600",
      },
    ],
    [owners.length, tenants.length, providers.length, properties.length, isDark]
  );

  const currentList = useMemo(() => {
    if (activeTab === "owners") return owners;
    if (activeTab === "tenants") return tenants;
    if (activeTab === "providers") return providers;
    if (activeTab === "properties") return properties;
    if (activeTab === "communications") return communications;
    return [];
  }, [activeTab, owners, tenants, providers, properties, communications]);

  const handleOwnerPropertyDetails = useCallback(
    async (owner) => {
      const ownerId = getUserId(owner);
      setSelectedOwner(owner);
      setSelectedProperty(null);
      setOwnerDetailsLoading(true);

      try {
        const details = await getFirstWorking([
          `admin/owners/${ownerId}/properties/`,
          `admin/owners/${ownerId}/properties`,
          `admin/owner/${ownerId}/properties/`,
          `admin/owner/${ownerId}/properties`,
          `owners/${ownerId}/properties/`,
          `owners/${ownerId}/properties`,
        ]);

        const list = safeArr(details);
        if (list.length > 0) {
          setSelectedOwnerProperties(list);
        } else {
          const fallback = properties.filter((p) => getPropertyOwnerId(p) === ownerId);
          setSelectedOwnerProperties(fallback);
        }
      } catch (e) {
        const fallback = properties.filter((p) => getPropertyOwnerId(p) === ownerId);
        setSelectedOwnerProperties(fallback);
      } finally {
        setOwnerDetailsLoading(false);
      }
    },
    [properties]
  );

  const openAllListings = useCallback(async () => {
    setSelectedOwner(null);
    setSelectedOwnerProperties([]);
    setSelectedProperty(null);
    setActiveTab("properties");
    await loadProperties();
  }, [loadProperties]);

  const openCommunications = useCallback(async () => {
    setSelectedOwner(null);
    setSelectedOwnerProperties([]);
    setSelectedProperty(null);
    setActiveTab("communications");
    await loadCommunications();
  }, [loadCommunications]);

  const openPropertyDetails = (property) => {
    setSelectedOwner(null);
    setSelectedOwnerProperties([]);
    setSelectedProperty(property);
    setActiveTab("properties");
  };

  const renderOwnersTable = () => (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-left">
        <thead>
          <tr className={`border-b ${tableLine}`}>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest pl-4 ${mutedText}`}>ID</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Owner Name</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Email Address</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Properties Added</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest pr-4 text-right ${mutedText}`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {owners.map((u, idx) => {
            const ownerId = getUserId(u);
            const propertyCount = ownerPropertyCountMap[ownerId] || 0;

            return (
              <tr
                key={ownerId ?? idx}
                className={`border-b ${tableLine} ${hoverRow} transition-colors`}
              >
                <td className={`py-4 pl-4 text-xs font-mono ${mutedText}`}>#{ownerId ?? "-"}</td>
                <td className={`py-4 font-bold ${headerText}`}>{getUserName(u)}</td>
                <td className={`py-4 text-sm font-medium ${mutedText}`}>{getUserEmail(u)}</td>
                <td className="py-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-blue-100">
                    {propertyCount} Property{propertyCount !== 1 ? "ies" : "y"}
                  </span>
                </td>
                <td className="py-4 pr-4 text-right">
                  <button
                    onClick={() => handleOwnerPropertyDetails(u)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    Property Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderUsersTable = (list, roleLabel, badgeClass) => (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-left">
        <thead>
          <tr className={`border-b ${tableLine}`}>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest pl-4 ${mutedText}`}>ID</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest ${mutedText}`}>User Entity</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Email Address</th>
            <th className={`py-4 text-[10px] font-black uppercase tracking-widest pr-4 text-right ${mutedText}`}>Access Role</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u, idx) => (
            <tr
              key={getUserId(u) ?? idx}
              className={`border-b ${tableLine} ${hoverRow} transition-colors`}
            >
              <td className={`py-4 pl-4 text-xs font-mono ${mutedText}`}>#{getUserId(u) ?? "-"}</td>
              <td className={`py-4 font-bold ${headerText}`}>{getUserName(u)}</td>
              <td className={`py-4 text-sm font-medium ${mutedText}`}>{getUserEmail(u)}</td>
              <td className="py-4 pr-4 text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}
                >
                  {roleLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPropertyCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-7">
      {properties.map((p, idx) => {
        const isBooked = getBookedStatus(p);
        const image = formatImageUrl(getPropertyImage(p));
        const title = getPropertyTitle(p);
        const location = getPropertyLocation(p);
        const price = getPropertyPrice(p);
        const type = getPropertyType(p);
        const desc = getPropertyDescription(p);

        return (
          <div
            key={getPropertyId(p) ?? idx}
            className={`overflow-hidden rounded-[30px] border shadow-sm transition-all hover:-translate-y-1 ${cardBg}`}
          >
            <div className="relative h-[260px] overflow-hidden bg-slate-100">
              {image ? (
                <img
                  src={image}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-100">
                  <ImageIcon className="w-12 h-12 text-slate-300" />
                </div>
              )}

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white text-blue-600 text-[11px] font-black uppercase tracking-wider shadow">
                  {type}
                </span>

                {isBooked ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-black uppercase tracking-wider shadow">
                    Booked
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow">
                    Available
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className={`flex items-center gap-2 text-sm font-medium ${mutedText}`}>
                <MapPin className="w-4 h-4 text-blue-500" />
                {location}
              </div>

              <h3 className={`mt-3 text-[22px] font-black ${headerText}`}>{title}</h3>

              <p className={`mt-2 text-sm leading-7 ${mutedText} line-clamp-2`}>
                {desc}
              </p>

              <div className={`mt-5 pt-5 border-t ${tableLine}`}>
                <div className="text-[16px] font-black text-blue-600">
                  Rs {price}
                  <span className={`ml-1 text-base font-semibold ${mutedText}`}>/mo</span>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <span className={`font-semibold ${mutedText}`}>Owner:</span>{" "}
                <span className={headerText}>{getPropertyOwnerName(p)}</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => openPropertyDetails(p)}
                  className={`h-12 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${actionBtnBase}`}
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>

                <button
                  disabled
                  className={`h-12 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isBooked
                      ? "bg-red-400 text-white cursor-not-allowed"
                      : "bg-emerald-600 text-white cursor-default"
                  }`}
                >
                  {isBooked ? "Booked" : "Available"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCommunicationCards = () => (
    <div className="space-y-5 h-[650px] overflow-y-auto pr-3 custom-scrollbar">
      {communicationLoading ? (
        <div className="py-12 flex justify-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : communications.length === 0 ? (
        <div className={`py-12 text-center font-medium italic ${mutedText}`}>
          No communication records found.
        </div>
      ) : (
        communications.map((c, idx) => {
          const senderRole = getCommunicationSenderRole(c);
          const receiverRole = getCommunicationReceiverRole(c);
          const chatType = getConversationType(c);
          const channel = getCommunicationChannel(c);

          return (
            <div
              key={getCommunicationId(c) ?? idx}
              className={`rounded-[26px] border p-6 ${softCardBg}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${typeBadgeClass(
                        chatType
                      )}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {chatType}
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border bg-slate-50 text-slate-700 border-slate-200">
                      <PhoneCall className="w-3.5 h-3.5" />
                      {channel}
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border bg-slate-50 text-slate-700 border-slate-200">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {String(getCommunicationDate(c))}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${roleBadgeClass(
                        senderRole
                      )}`}
                    >
                      <UserCircle2 className="w-3.5 h-3.5" />
                      {getCommunicationSender(c)} ({senderRole})
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${roleBadgeClass(
                        receiverRole
                      )}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {getCommunicationReceiver(c)} ({receiverRole})
                    </span>
                  </div>
                </div>

                <div className="lg:w-[320px]">
                  <div
                    className={`rounded-[22px] border p-5 h-full flex flex-col ${
                      isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className={`text-[10px] uppercase tracking-[0.18em] font-black ${mutedText} mb-3`}>
                      Last Transmission Content
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
                      <p className={`text-sm leading-relaxed font-medium italic ${headerText}`}>
                        "{c.last_message || "No message content available."}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderMainSection = () => {
    const title =
      activeTab === "owners"
        ? "Owners"
        : activeTab === "tenants"
        ? "Tenants"
        : activeTab === "providers"
        ? "Service Providers"
        : activeTab === "communications"
        ? "Owner / Provider / Tenant / Roommate Communication List"
        : "All Property Listings";

    const totalCount =
      activeTab === "communications" ? communications.length : currentList.length;

    return (
      <div className={`rounded-[30px] border shadow-sm p-6 mb-8 overflow-hidden ${cardBg}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-2xl font-black ${headerText}`}>{title}</h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-500"
            }`}
          >
            {totalCount} total
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : activeTab === "owners" ? (
          owners.length === 0 ? (
            <div className={`py-12 text-center font-medium italic ${mutedText}`}>
              No property owners registered yet.
            </div>
          ) : (
            renderOwnersTable()
          )
        ) : activeTab === "tenants" ? (
          tenants.length === 0 ? (
            <div className={`py-12 text-center font-medium italic ${mutedText}`}>
              No tenants registered yet.
            </div>
          ) : (
            renderUsersTable(
              tenants,
              "TENANT",
              "bg-emerald-50 text-emerald-600 border-emerald-100"
            )
          )
        ) : activeTab === "providers" ? (
          providers.length === 0 ? (
            <div className={`py-12 text-center font-medium italic ${mutedText}`}>
              No service providers registered yet.
            </div>
          ) : (
            renderUsersTable(
              providers,
              "PROVIDER",
              "bg-purple-50 text-purple-600 border-purple-100"
            )
          )
        ) : activeTab === "communications" ? (
          renderCommunicationCards()
        ) : properties.length === 0 ? (
          <div className={`py-12 text-center font-medium italic ${mutedText}`}>
            No property records found.
          </div>
        ) : (
          renderPropertyCards()
        )}
      </div>
    );
  };

  const renderOwnerDetailsPanel = () => (
    <div className={`rounded-[30px] border shadow-sm p-6 overflow-hidden ${cardBg}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-xl font-black ${headerText}`}>Owner Property Summary</h3>
        {selectedOwner ? (
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">
            {selectedOwnerProperties.length} Total
          </span>
        ) : null}
      </div>

      {!selectedOwner ? (
        <div
          className={`min-h-[220px] rounded-[24px] border border-dashed flex items-center justify-center text-center px-6 ${softCardBg}`}
        >
          <div>
            <Building2 className={`w-10 h-10 mx-auto mb-3 ${mutedText}`} />
            <p className={`font-semibold ${mutedText}`}>
              Click <span className="text-blue-600">Property Details</span> on any owner to see
              their property list.
            </p>
          </div>
        </div>
      ) : ownerDetailsLoading ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div>
          <div
            className={`rounded-[24px] p-5 mb-5 border ${
              isDark ? "border-blue-500/20 bg-blue-500/10" : "border-blue-100 bg-blue-50/70"
            }`}
          >
            <div className={`text-lg font-black ${headerText}`}>{getUserName(selectedOwner)}</div>
            <div className={`text-sm font-medium mt-1 ${mutedText}`}>{getUserEmail(selectedOwner)}</div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 rounded-full text-xs font-black uppercase tracking-wider border border-blue-100">
              <Building2 className="w-4 h-4" />
              {selectedOwnerProperties.length} Properties Added
            </div>
          </div>

          {selectedOwnerProperties.length === 0 ? (
            <div className={`text-center py-10 font-medium italic ${mutedText}`}>
              This owner has not added any properties yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
              {selectedOwnerProperties.map((p, idx) => {
                const isBooked = getBookedStatus(p);

                return (
                  <div
                    key={getPropertyId(p) ?? idx}
                    className={`rounded-[24px] border p-5 transition-all ${softCardBg}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-lg font-black ${headerText}`}>
                          {getPropertyTitle(p)}
                        </div>

                        <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${mutedText}`}>
                          <MapPin className="w-4 h-4 text-blue-500" />
                          {getPropertyLocation(p)}
                        </div>

                        <div className={`mt-2 flex items-center gap-2 text-sm font-bold ${headerText}`}>
                          <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
                          Rs {getPropertyPrice(p)}/mo
                        </div>

                        <button
                          onClick={() => openPropertyDetails(p)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          View Full Details
                        </button>
                      </div>

                      {isBooked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-100 whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" /> Booked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Available
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPropertyDetailsPanel = () => (
    <div className={`rounded-[30px] border shadow-sm p-6 overflow-hidden ${cardBg}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-xl font-black ${headerText}`}>Property Details</h3>
        {selectedProperty ? (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              getBookedStatus(selectedProperty)
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            }`}
          >
            {getBookedStatus(selectedProperty) ? "Booked" : "Available"}
          </span>
        ) : null}
      </div>

      {!selectedProperty ? (
        <div
          className={`min-h-[260px] rounded-[24px] border border-dashed flex items-center justify-center text-center px-6 ${softCardBg}`}
        >
          <div>
            <FileText className={`w-10 h-10 mx-auto mb-3 ${mutedText}`} />
            <p className={`font-semibold ${mutedText}`}>
              Click the <span className="text-blue-600">Details</span> button on any property card
              to see the full property information here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {formatImageUrl(getPropertyImage(selectedProperty)) ? (
            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <img
                src={formatImageUrl(getPropertyImage(selectedProperty))}
                alt={getPropertyTitle(selectedProperty)}
                className="w-full h-[240px] object-cover"
              />
            </div>
          ) : null}

          <div
            className={`rounded-[24px] p-5 border ${
              isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className={`text-2xl font-black ${headerText}`}>
              {getPropertyTitle(selectedProperty)}
            </div>
            <div className={`mt-2 flex items-center gap-2 text-sm ${mutedText}`}>
              <MapPin className="w-4 h-4 text-blue-500" />
              {getPropertyLocation(selectedProperty)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-[22px] border p-4 ${softCardBg}`}>
              <div className={`text-[11px] uppercase tracking-[0.16em] font-black ${mutedText}`}>
                Owner
              </div>
              <div className={`mt-2 font-bold ${headerText}`}>
                {getPropertyOwnerName(selectedProperty)}
              </div>
            </div>

            <div className={`rounded-[22px] border p-4 ${softCardBg}`}>
              <div className={`text-[11px] uppercase tracking-[0.16em] font-black ${mutedText}`}>
                Monthly Price
              </div>
              <div className="mt-2 font-bold text-blue-600">
                Rs {getPropertyPrice(selectedProperty)}/mo
              </div>
            </div>

            <div className={`rounded-[22px] border p-4 ${softCardBg}`}>
              <div className={`text-[11px] uppercase tracking-[0.16em] font-black ${mutedText}`}>
                Property Type
              </div>
              <div className={`mt-2 font-bold ${headerText}`}>
                {getPropertyType(selectedProperty)}
              </div>
            </div>

            <div className={`rounded-[22px] border p-4 ${softCardBg}`}>
              <div className={`text-[11px] uppercase tracking-[0.16em] font-black ${mutedText}`}>
                Posted Date
              </div>
              <div className={`mt-2 font-bold ${headerText}`}>
                {String(getPropertyCreatedDate(selectedProperty))}
              </div>
            </div>

            <div className={`rounded-[22px] border p-4 ${softCardBg}`}>
              <div className={`text-[11px] uppercase tracking-[0.16em] font-black ${mutedText}`}>
                Bedrooms
              </div>
              <div className={`mt-2 font-bold ${headerText}`}>
                {String(getPropertyBedrooms(selectedProperty))}
              </div>
            </div>

            <div className={`rounded-[22px] border p-4 ${softCardBg}`}>
              <div className={`text-[11px] uppercase tracking-[0.16em] font-black ${mutedText}`}>
                Bathrooms
              </div>
              <div className={`mt-2 font-bold ${headerText}`}>
                {String(getPropertyBathrooms(selectedProperty))}
              </div>
            </div>
          </div>

          <div className={`rounded-[22px] border p-5 ${softCardBg}`}>
            <div className={`text-[11px] uppercase tracking-[0.16em] font-black mb-3 ${mutedText}`}>
              Description Provided By Owner
            </div>
            <div className={`text-sm leading-7 ${headerText}`}>
              {getPropertyDescription(selectedProperty)}
            </div>
          </div>

          <div className={`rounded-[22px] border p-5 ${softCardBg}`}>
            <div className={`text-[11px] uppercase tracking-[0.16em] font-black mb-3 ${mutedText}`}>
              Extra Information
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={`text-sm font-semibold ${mutedText}`}>Area</div>
                <div className={`mt-1 font-bold ${headerText}`}>
                  {String(getPropertyArea(selectedProperty))}
                </div>
              </div>

              <div>
                <div className={`text-sm font-semibold ${mutedText}`}>Listing ID</div>
                <div className={`mt-1 font-bold ${headerText}`}>
                  #{getPropertyId(selectedProperty) ?? "-"}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[22px] border p-5 ${softCardBg}`}>
            <div className={`text-[11px] uppercase tracking-[0.16em] font-black mb-3 ${mutedText}`}>
              Facilities / Amenities
            </div>

            {getPropertyFacilities(selectedProperty).length === 0 ? (
              <div className={`text-sm ${mutedText}`}>No facilities data available.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {getPropertyFacilities(selectedProperty).map((item, i) => (
                  <span
                    key={`${item}-${i}`}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderCommunicationSummary = () => (
    <div className={`rounded-[30px] border shadow-sm p-6 ${cardBg}`}>
      <h3 className={`text-xl font-black mb-5 ${headerText}`}>Communication Summary</h3>

      <div className="space-y-4">
        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-indigo-500/20 bg-indigo-500/10" : "border-indigo-100 bg-indigo-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Total Communications
          </div>
          <div className="text-3xl font-black text-indigo-600">{communicationStats.total}</div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-blue-500/20 bg-blue-500/10" : "border-blue-100 bg-blue-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Tenant - Owner
          </div>
          <div className="text-3xl font-black text-blue-600">{communicationStats.tenantOwner}</div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-purple-500/20 bg-purple-500/10" : "border-purple-100 bg-purple-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Owner - Provider
          </div>
          <div className="text-3xl font-black text-purple-600">{communicationStats.ownerProvider}</div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-pink-500/20 bg-pink-500/10" : "border-pink-100 bg-pink-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Roommate
          </div>
          <div className="text-3xl font-black text-pink-600">{communicationStats.roommate}</div>
        </div>
      </div>
    </div>
  );

  const renderPropertySummary = () => (
    <div className={`rounded-[30px] border shadow-sm p-6 ${cardBg}`}>
      <h3 className={`text-xl font-black mb-5 ${headerText}`}>Quick Property Summary</h3>

      <div className="space-y-4">
        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-orange-500/20 bg-orange-500/10" : "border-orange-100 bg-orange-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Total Properties
          </div>
          <div className="text-3xl font-black text-orange-600">{properties.length}</div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-red-500/20 bg-red-500/10" : "border-red-100 bg-red-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Booked
          </div>
          <div className="text-3xl font-black text-red-600">{bookedCount}</div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${
            isDark ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50/70"
          }`}
        >
          <div className={`text-sm font-black uppercase tracking-[0.16em] mb-2 ${mutedText}`}>
            Available
          </div>
          <div className="text-3xl font-black text-emerald-600">{availableCount}</div>
        </div>
      </div>
    </div>
  );

  const renderSidePanel = () => {
    if (activeTab === "owners") return renderOwnerDetailsPanel();
    if (activeTab === "communications") return renderCommunicationSummary();
    if (activeTab === "properties") return renderPropertyDetailsPanel();
    return renderPropertySummary();
  };

  if (!role) return null;

  return (
    <Shell
      title="Admin Dashboard"
      subtitle="Manage platform users, property listings, communication lists, furniture, and revenue from one place."
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/admin")}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors rounded-xl font-bold text-sm flex items-center gap-2 border border-red-100"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto">
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast({ type: "info", msg: "" })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {stats.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setSelectedOwner(null);
                setSelectedOwnerProperties([]);
                if (s.key !== "properties") setSelectedProperty(null);
                setActiveTab(s.key);
              }}
              className={`rounded-[28px] border p-7 shadow-sm flex items-center gap-5 group transition-all text-left ${
                activeTab === s.key
                  ? isDark
                    ? "bg-blue-500/10 border-blue-400/30"
                    : "bg-blue-50 border-blue-200"
                  : isDark 
                    ? "bg-white/5 border-white/10 hover:bg-white/10" 
                    : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center ${s.iconWrap}`}>
                <s.icon className={`w-8 h-8 ${s.iconColor}`} />
              </div>

              <div>
                <div className={`text-[11px] font-black uppercase tracking-[0.22em] mb-1 ${mutedText}`}>
                  {s.label}
                </div>
                <div className={`text-3xl font-black ${headerText}`}>
                  {loading ? "..." : s.count}
                </div>
              </div>

              <ChevronRight
                className={`w-5 h-5 ml-auto transition-colors ${
                  isDark ? "text-slate-500 group-hover:text-slate-300" : "text-slate-300 group-hover:text-slate-500"
                }`}
              />
            </button>
          ))}
        </div>

        <div className={`mb-10 rounded-[30px] border shadow-sm p-5 ${pageBg}`}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isDark ? "bg-blue-500/15" : "bg-blue-50"
              }`}
            >
              <PanelsTopLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className={`text-xl font-black ${headerText}`}>Tools Hub</h3>
              <p className={`text-sm font-medium ${mutedText}`}>
                Quick access to all important admin controls
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-all ${actionBtnBase}`}
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => {
                setSelectedOwner(null);
                setSelectedOwnerProperties([]);
                setSelectedProperty(null);
                setActiveTab("owners");
              }}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeTab === "owners"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : actionBtnBase
              }`}
            >
              <Home className="w-4 h-4" />
              Owners
            </button>

            <button
              onClick={() => {
                setSelectedOwner(null);
                setSelectedOwnerProperties([]);
                setSelectedProperty(null);
                setActiveTab("tenants");
              }}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeTab === "tenants"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : actionBtnBase
              }`}
            >
              <Users className="w-4 h-4" />
              Tenants
            </button>

            <button
              onClick={() => {
                setSelectedOwner(null);
                setSelectedOwnerProperties([]);
                setSelectedProperty(null);
                setActiveTab("providers");
              }}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeTab === "providers"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : actionBtnBase
              }`}
            >
              <BriefcaseBusiness className="w-4 h-4" />
              Service Providers
            </button>

            <button
              onClick={openAllListings}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeTab === "properties"
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                  : actionBtnBase
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              All Listings
            </button>

            <button
              onClick={openCommunications}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeTab === "communications"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : actionBtnBase
              }`}
            >
              <MessageCircle className="w-4 h-4 text-blue-500" />
              Broadcasts
            </button>

            <button
              onClick={() => nav("/admin/furnitures")}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${actionBtnBase}`}
            >
              <Sofa className="w-4 h-4 text-purple-500" />
              Furniture
            </button>

            <button
              onClick={() => nav("/admin/booking-payments")}
              className={`px-5 h-12 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${actionBtnBase}`}
            >
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Revenue
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className={`rounded-[28px] border shadow-sm p-6 ${cardBg}`}>
            <div className={`text-[11px] font-black uppercase tracking-[0.18em] mb-2 ${mutedText}`}>
              Total Properties
            </div>
            <div className={`text-3xl font-black ${headerText}`}>
              {loading ? "..." : properties.length}
            </div>
          </div>

          <div className={`rounded-[28px] border shadow-sm p-6 ${cardBg}`}>
            <div className={`text-[11px] font-black uppercase tracking-[0.18em] mb-2 ${mutedText}`}>
              Booked Properties
            </div>
            <div className="text-3xl font-black text-red-600">
              {loading ? "..." : bookedCount}
            </div>
          </div>

          <div className={`rounded-[28px] border shadow-sm p-6 ${cardBg}`}>
            <div className={`text-[11px] font-black uppercase tracking-[0.18em] mb-2 ${mutedText}`}>
              Available Properties
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {loading ? "..." : availableCount}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">{renderMainSection()}</div>
          <div className="xl:col-span-1">{renderSidePanel()}</div>
        </div>
      </div>
    </Shell>
  );
}