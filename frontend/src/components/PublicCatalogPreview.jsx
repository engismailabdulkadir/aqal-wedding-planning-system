import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getHalls,
  getVenues,
} from '../services/venueService.js';
import {
  getListings,
} from '../services/planningService.js';

// Public catalog-ka homepage-ka lagu soo bandhigayo
export default function PublicCatalogPreview() {

  // Venues
  const [venues, setVenues] =
    useState([]);

  // Halls
  const [halls, setHalls] =
    useState([]);

  // Services
  const [services, setServices] =
    useState([]);

  // Marka component-ka la load-gareeyo API-yada wac
  useEffect(() => {

    // Hel venues-ka, 3 kaliya soo bandhig
    getVenues()
      .then((d) =>
        setVenues(
          (d.venues || []).slice(0, 3)
        )
      )
      .catch(() => {});

    // Hel halls-ka, 3 kaliya soo bandhig
    getHalls()
      .then((d) =>
        setHalls(
          (d.halls || []).slice(0, 3)
        )
      )
      .catch(() => {});

    // Hel services-ka cusub
    getListings({
      sort: 'newest',
    })
      .then((d) =>
        setServices(
          (d.listings || []).slice(0, 4)
        )
      )
      .catch(() => {});
  }, []);

  return (
    <section className="bg-stone-50 py-20">
      <div className="section-shell">

        {/* ================= VENUES ================= */}

        <div className="flex items-end justify-between gap-4">

          <div>
            <p className="text-sm font-semibold text-brand-600">
              Browse
            </p>

            <h2 className="mt-2 font-display text-4xl font-semibold">
              Venues, halls, and services
            </h2>
          </div>

          {/* Browse venues */}
          <Link
            to="/venues"
            className="hidden rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white sm:inline-block"
          >
            Browse venues
          </Link>
        </div>

        {/* Venue cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">

          {venues.map((venue) => (
            <Link
              key={venue._id}
              to={`/venues/${venue._id}`}
              className="rounded-3xl bg-white p-6 shadow-sm"
            >

              <h3 className="font-display text-2xl font-semibold">
                {venue.name}
              </h3>

              <p className="mt-2 text-sm text-stone-500">
                {venue.city} ·{' '}
                {venue.halls?.length || 0}{' '}
                halls
              </p>

            </Link>
          ))}

        </div>

        {/* ================= HALLS ================= */}

        <div className="mt-12 flex items-center justify-between">

          <h3 className="font-display text-2xl font-semibold">
            Halls
          </h3>

          <Link
            to="/halls"
            className="text-sm font-semibold text-brand-700"
          >
            All halls
          </Link>
        </div>

        {/* Hall cards */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">

          {halls.map((hall) => (
            <div
              key={hall._id}
              className="rounded-2xl border bg-white p-5"
            >

              {/* Venue name */}
              <p className="text-xs uppercase tracking-widest text-brand-600">
                {hall.venue?.name}
              </p>

              {/* Hall name */}
              <p className="mt-2 font-semibold">
                {hall.hallName}
              </p>

              {/* Capacity */}
              <p className="text-sm text-stone-500">
                {hall.capacity} guests
              </p>

            </div>
          ))}

        </div>

        {/* ================= SERVICES ================= */}

        <div className="mt-12 flex items-center justify-between">

          <h3 className="font-display text-2xl font-semibold">
            Wedding services
          </h3>

          <Link
            to="/services"
            className="text-sm font-semibold text-brand-700"
          >
            Marketplace
          </Link>
        </div>

        {/* Service cards */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {services.map((item) => (
            <Link
              key={item._id}
              to={`/services/${item._id}`}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >

              {/* Category */}
              <p className="text-xs capitalize text-brand-600">
                {item.category?.replaceAll(
                  '_',
                  ' '
                )}
              </p>

              {/* Service name */}
              <p className="mt-2 font-semibold">
                {item.name}
              </p>

              {/* Price */}
              <p className="mt-1 text-sm text-stone-500">
                ${item.price}
              </p>

            </Link>
          ))}

        </div>
      </div>
    </section>
  );
}