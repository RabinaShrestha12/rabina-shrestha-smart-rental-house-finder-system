import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function PublicListings() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    api.get("/public/listings/")
      .then(res => setListings(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-10 text-white">
      <h2 className="text-2xl mb-6">Available Listings</h2>

      {listings.length === 0 ? (
        <p>No listings found.</p>
      ) : (
        listings.map(l => (
          <div key={l.id} className="mb-4 p-4 border rounded">
            <h3 className="font-semibold">{l.title}</h3>
            <p>{l.location}</p>
            <p>${l.price_per_week}/week</p>
          </div>
        ))
      )}
    </div>
  );
}
