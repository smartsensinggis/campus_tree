defmodule CampustreeWeb.Dashboard do
  use CampustreeWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    tree_count = Campustree.Trees.geojson() |> Map.fetch!("features") |> length()

    {:ok,
     socket
     |> assign(:tree_count, tree_count)
     |> assign(:selected_tree, nil)}
  end

  @impl true
  def handle_event("tree_selected", %{"properties" => properties}, socket) do
    IO.inspect(properties, label: "SELECTED TREE")

    {:noreply,
     socket
     |> assign(:selected_tree, normalize_selected_tree(properties))
     |> push_event("scroll_to_map_info", %{})}
  end

  defp normalize_selected_tree(properties) do
    %{
      "Local_Name" => display_field(properties, ["Local_Name", "name", "local_name"]),
      "Scientific" => display_field(properties, ["Scientific", "scientific_name"]),
      "Family" => display_field(properties, ["Family", "family"]),
      "Site_Name" => display_field(properties, ["Site_Name", "site_name", "site"]),
      "Area" => display_field(properties, ["Area", "area"])
    }
  end

  defp display_field(properties, keys) do
    Enum.find_value(keys, fn key ->
      case Map.get(properties, key) do
        value when is_binary(value) ->
          case String.trim(value) do
            "" -> nil
            value -> value
          end

        value when is_integer(value) or is_float(value) ->
          to_string(value)

        _ ->
          nil
      end
    end) || "Not available"
  end
end
