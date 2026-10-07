import { useEffect, useState } from "react";

interface LocationAddressProps {
  latitude: number;
  longitude: number;
}

const addressCache = new Map<string, string>();

export default function LocationAddress({
  latitude,
  longitude,
}: LocationAddressProps) {
  const cacheKey = `${Number(latitude).toFixed(5)},${Number(
    longitude,
  ).toFixed(5)}`;

  const cachedAddress = addressCache.get(cacheKey);

  const [address, setAddress] = useState<string | null>(
    cachedAddress ?? null,
  );

  const [loading, setLoading] = useState(
    !cachedAddress,
  );

  useEffect(() => {
    let cancelled = false;

    const getAddress = async () => {
      const existingAddress =
        addressCache.get(cacheKey);

      if (existingAddress) {
        setAddress(existingAddress);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const url =
          "https://nominatim.openstreetmap.org/reverse" +
          "?format=jsonv2" +
          `&lat=${encodeURIComponent(latitude)}` +
          `&lon=${encodeURIComponent(longitude)}` +
          "&zoom=18" +
          "&addressdetails=1";

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Address lookup failed: ${response.status}`,
          );
        }

        const result = (await response.json()) as {
          display_name?: string;
        };

        const resolvedAddress =
          result.display_name?.trim();

        if (!resolvedAddress) {
          throw new Error(
            "No readable address was returned.",
          );
        }

        addressCache.set(
          cacheKey,
          resolvedAddress,
        );

        if (!cancelled) {
          setAddress(resolvedAddress);
        }
      } catch {
        if (!cancelled) {
          setAddress(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    getAddress();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, latitude, longitude]);

  return (
    <div className="min-w-0">
      <p className="max-w-2xl text-sm font-semibold leading-6 text-[#102A43]">
        {loading
          ? "Resolving address..."
          : address || "Address unavailable"}
      </p>

      <p className="mt-1 font-mono text-xs text-slate-500">
        Coordinates:{" "}
        {Number(latitude).toFixed(6)},{" "}
        {Number(longitude).toFixed(6)}
      </p>
    </div>
  );
}