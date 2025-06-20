import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { pb, getAuthToken } from "~/utils/pocketbase";

export interface GardensListProps {
  onGardenSelected?: (gardenId: string) => void;
  onRefresh?: () => void;
  showActions?: boolean;
  showCreateButton?: boolean;
}

export const GardensList = component$<GardensListProps>(
  ({
    // onGardenSelected = () => {},
    onRefresh = () => {},
    showActions = true,
    showCreateButton = true,
  }) => {
    const isLoading = useSignal(false);
    const isDeleting = useSignal(false);
    const gardens = useSignal<any[]>([]);
    const errorSignal = useSignal("");
    const successSignal = useSignal("");

    // Function to load gardens from PocketBase
    const loadGardens = $(async () => {
      isLoading.value = true;
      errorSignal.value = "";

      try {
        // Set the auth token for the request
        pb.authStore.save(getAuthToken() || "", null);

        try {
          const response = await pb.collection("gardens").getList(1, 50, {
            sort: "title",
          });

          function deduplicateById<T extends { id: string }>(items: T[]): T[] {
            const map: Record<string, T> = {};
            for (const item of items) {
              map[item.id] = item;
            }
            return Object.values(map);
          }
          gardens.value = deduplicateById(response.items) || [];
          onRefresh();
        } catch (err: any) {
          errorSignal.value = err.message || "Failed to load gardens";
          console.error("Error loading gardens:", err);
        }
      } catch (error) {
        console.error("Error loading gardens:", error);
        errorSignal.value = "An error occurred while loading gardens";
      } finally {
        isLoading.value = false;
      }
    });

    // Load gardens when component mounts
    useVisibleTask$(async () => {
      await loadGardens();
    });

    // Function to delete a garden
    const deleteGarden = $(async (gardenId: string) => {
      if (!confirm("Are you sure you want to delete this garden?")) {
        return;
      }

      isDeleting.value = true;
      errorSignal.value = "";
      successSignal.value = "";

      try {
        // Set the auth token for the request
        pb.authStore.save(getAuthToken() || "", null);

        try {
          await pb.collection("gardens").delete(gardenId);
          successSignal.value = "Garden deleted successfully";
          // Refresh the garden list
          await loadGardens();
        } catch (err: any) {
          errorSignal.value = err.message || "Failed to delete garden";
          console.error("Error deleting garden:", err);
        }
      } catch (error) {
        console.error("Error deleting garden:", error);
        errorSignal.value = "An error occurred while deleting the garden";
      } finally {
        isDeleting.value = false;
      }
    });

    return (
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title">Градини</h2>

          {errorSignal.value && (
            <div class="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorSignal.value}</span>
            </div>
          )}

          {successSignal.value && (
            <div class="alert alert-success mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{successSignal.value}</span>
            </div>
          )}

          {isLoading.value ? (
            <div class="flex justify-center p-4">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          ) : gardens.value.length === 0 ? (
            <div class="text-center p-4">
              <p>Няма добавени градини. Създайте първата!</p>
            </div>
          ) : (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gardens.value.map((garden) => (
                <div key={garden.id} class="card bg-base-200 shadow-md">
                  {garden.photos && garden.photos.length > 0 && (
                    <figure>
                      <img
                        src={pb.files.getURL(garden, garden.photos[0])}
                        alt={garden.title}
                        class="w-full h-48 object-cover"
                      />
                    </figure>
                  )}
                  <div class="card-body">
                    <h3 class="card-title">{garden.title}</h3>
                    <p>{garden.address}</p>
                    <div class="card-actions justify-end mt-2">
                      <a
                        href={`/gardens/details/${garden.id}`}
                        class="btn btn-primary btn-sm"
                      >
                        Детайли
                      </a>
                      {showActions && (
                        <>
                          <a
                            href={`/gardens/edit/${garden.id}`}
                            class="btn btn-sm btn-secondary"
                          >
                            Редактирай
                          </a>
                          <button
                            class={`btn btn-sm btn-error ${
                              isDeleting.value ? "loading" : ""
                            }`}
                            onClick$={() => deleteGarden(garden.id)}
                            disabled={isDeleting.value}
                          >
                            Изтрий
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCreateButton && (
            <div class="card-actions justify-end mt-4">
              <a href="/gardens/create" class="btn btn-primary">
                Създай нова
              </a>
            </div>
          )}
        </div>
      </div>
    );
  },
);
