import { Map, setWorkerUrl } from "maplibre-gl"

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

const INITIAL_CENTER = [74.29986723118611, 31.499919514014874]

const LULC_CLASSES = [
  { label: "Tree Cover", color: "#e41a1c" },
  { label: "Grassland", color: "#377eb8" },
  { label: "Agriculture", color: "#4daf4a" },
  { label: "Built-Up", color: "#ffd92f" },
  { label: "Water Body", color: "#984ea3" },
  { label: "Barren Land", color: "#ff7f00" },
  { label: "Road", color: "#a65628" }
]

const normalizeName = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""

const scientificNameFrom = (properties) =>
  normalizeName(properties?.Scientific) ||
  normalizeName(properties?.scientific_name)

const speciesColor = (index) => {
  const hue = (index * 137.508) % 360
  const saturation = 0.66
  const lightness = 0.42
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1))
  const offset = lightness - chroma / 2
  const [red, green, blue] =
    hue < 60 ? [chroma, x, 0] :
      hue < 120 ? [x, chroma, 0] :
        hue < 180 ? [0, chroma, x] :
          hue < 240 ? [0, x, chroma] :
            hue < 300 ? [x, 0, chroma] : [chroma, 0, x]

  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}

const TreeMap = {
  async mounted() {
    const eventController = new AbortController()
    this.eventController = eventController

    let treeGeoJSON, canopyGeoJSON
    try {
      const [treeResponse, canopyResponse] = await Promise.all([
        fetch("/data/campus_trees.geojson", { signal: eventController.signal }),
        fetch("/data/campus_polygons.geojson", {
          signal: eventController.signal
        })
      ])

      if (!treeResponse.ok) {
        throw new Error(
          `Tree GeoJSON request failed with HTTP ${treeResponse.status}.`
        )
      }
      if (!canopyResponse.ok) {
        throw new Error(
          `Canopy GeoJSON request failed with HTTP ${canopyResponse.status}.`
        )
      }

      const geojsonData = await Promise.all([
        treeResponse.json(),
        canopyResponse.json()
      ])
      treeGeoJSON = geojsonData[0]
      canopyGeoJSON = geojsonData[1]
    } catch (error) {
      if (eventController.signal.aborted) return
      console.error("TreeMap could not load GeoJSON data.", error)
      throw error
    }

    if (
      treeGeoJSON?.type !== "FeatureCollection" ||
      !Array.isArray(treeGeoJSON.features)
    ) {
      throw new TypeError(
        "TreeMap requires tree GeoJSON as a FeatureCollection."
      )
    }

    if (
      canopyGeoJSON?.type !== "FeatureCollection" ||
      !Array.isArray(canopyGeoJSON.features)
    ) {
      throw new TypeError(
        "TreeMap requires canopy GeoJSON as a FeatureCollection."
      )
    }

    const normalizeFeatureSpecies = (feature) => {
      const properties = feature.properties || {}
      return {
        ...feature,
        properties: {
          ...properties,
          scientific_name_normalized: scientificNameFrom(properties)
        }
      }
    }

    canopyGeoJSON.features = canopyGeoJSON.features.map(normalizeFeatureSpecies)
    treeGeoJSON.features = treeGeoJSON.features.map(normalizeFeatureSpecies)

    const countSpecies = (features) =>
      features.reduce((counts, feature) => {
        const name = feature.properties.scientific_name_normalized
        if (name) counts.set(name, (counts.get(name) || 0) + 1)
        return counts
      }, new globalThis.Map())
    const canopySpeciesCounts = countSpecies(canopyGeoJSON.features)
    const treeSpeciesCounts = countSpecies(treeGeoJSON.features)
    const speciesNames = new Set([
      ...canopySpeciesCounts.keys(),
      ...treeSpeciesCounts.keys()
    ])

    const species = [...speciesNames]
      .sort((nameA, nameB) => nameA.localeCompare(nameB))
      .map((name, index) => ({
        key: `species:${name}`,
        name,
        label: name,
        count: canopySpeciesCounts.get(name) || 0,
        treeCount: treeSpeciesCounts.get(name) || 0,
        color: speciesColor(index)
      }))
    const speciesByName = new globalThis.Map(
      species.map((entry) => [entry.name, entry])
    )
    const unnamedCount = canopyGeoJSON.features.filter(
      (feature) => !feature.properties.scientific_name_normalized
    ).length
    const unnamedGroup = {
      key: "unnamed",
      label: "Name unavailable",
      count: unnamedCount,
      treeCount: treeGeoJSON.features.filter(
        (feature) => !feature.properties.scientific_name_normalized
      ).length,
      color: "#8c9290"
    }

    const speciesColorExpression = species.length
      ? [
          "match",
          ["get", "scientific_name_normalized"],
          ...species.flatMap(({ name, color }) => [name, color]),
          unnamedGroup.color
        ]
      : unnamedGroup.color

    const treeRadiusExpression = [
      "interpolate",
      ["linear"],
      ["zoom"],
      12,
      1,
      16,
      2,
      19,
      3.5
    ]

    const mapContainer = this.el.parentElement
    const controls = mapContainer?.querySelector(".map-controls")
    const mapInformationPanel = mapContainer?.querySelector(
      ".map-information-panel"
    )
    const mapInformationToggle = mapInformationPanel?.querySelector(
      ".map-information-toggle"
    )
    const mapInformationToggleLabel =
      mapInformationToggle?.querySelector("span")

    document
      .getElementById("campustree-welcome")
      ?.addEventListener(
        "click",
        (event) => event.currentTarget.classList.add("welcome-hidden"),
        { signal: eventController.signal }
      )

    mapInformationToggle?.addEventListener(
      "click",
      () => {
        const expanded =
          mapInformationToggle.getAttribute("aria-expanded") !== "true"

        mapInformationToggle.setAttribute("aria-expanded", String(expanded))
        mapInformationToggle.setAttribute(
          "aria-label",
          expanded ? "Minimize map information" : "Expand map information"
        )
        if (mapInformationToggleLabel) {
          mapInformationToggleLabel.textContent = expanded ? "−" : "+"
        }
        mapInformationPanel.classList.toggle(
          "map-information-collapsed",
          !expanded
        )
      },
      { signal: eventController.signal }
    )

    const map = new Map({
      container: this.el,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            attribution: "Tiles © Esri | "
          }
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }]
      },
      center: INITIAL_CENTER,
      zoom: 15,
      maxZoom: 18
    })
    this.map = map

    map.on("error", ({ error }) => {
      console.error("MapLibre map error.", error)
    })

    const legend = document.createElement("section")
    legend.className = "map-legend"
    legend.setAttribute("aria-label", "Map legend")
    legend.innerHTML = `
      <div class="legend-heading">
        <h2 class="map-legend-title">Legend</h2>
        <button class="legend-reset-button" type="button">Reset</button>
      </div>
      <div class="legend-tabs" role="tablist" aria-label="Map layers">
        <button
          class="legend-tab"
          id="legend-tab-canopy"
          type="button"
          role="tab"
          aria-controls="legend-panel-canopy"
          aria-selected="true"
          data-tab="canopy"
        >Canopy</button>
        <button
          class="legend-tab"
          id="legend-tab-lulc"
          type="button"
          role="tab"
          aria-controls="legend-panel-lulc"
          aria-selected="false"
          data-tab="lulc"
        >LULC</button>
      </div>
      <div
        class="legend-panel"
        id="legend-panel-canopy"
        role="tabpanel"
        aria-labelledby="legend-tab-canopy"
        data-panel="canopy"
      >
        
        <div class="legend-selection" hidden>
          <strong class="legend-selected-name"></strong>
          <span class="legend-selected-count"></span>
          <button class="legend-highlight-button" type="button">
            Highlight matching features
          </button>
        </div>
        <div class="legend-species-list"></div>
      </div>
      <div
        class="legend-panel"
        id="legend-panel-lulc"
        role="tabpanel"
        aria-labelledby="legend-tab-lulc"
        data-panel="lulc"
        hidden
      >
        <div class="lulc-legend-title">Land Use / Land Cover</div>
        
        <div class="lulc-legend-list"></div>
      </div>
    `

    const selectionPanel = legend.querySelector(".legend-selection")
    const selectedName = legend.querySelector(".legend-selected-name")
    const selectedCount = legend.querySelector(".legend-selected-count")
    const highlightButton = legend.querySelector(".legend-highlight-button")
    const resetButton = legend.querySelector(".legend-reset-button")
    const speciesList = legend.querySelector(".legend-species-list")
    const lulcList = legend.querySelector(".lulc-legend-list")
    const legendTabs = [...legend.querySelectorAll(".legend-tab")]
    const legendPanels = [...legend.querySelectorAll(".legend-panel")]

    let selectedSpecies = null
    let highlightedSpecies = null
    let activeTab = "canopy"
    let mapReady = false
    let treesEnabled = true
    let canopyEnabled = true
    let lulcEnabled = false

    const speciesMatchExpression = (name) => [
      "==",
      ["get", "scientific_name_normalized"],
      name
    ]

    const applyCanopyStyle = () => {
      if (!mapReady) return

      if (!highlightedSpecies) {
        map.setPaintProperty(
          "canopy-fill",
          "fill-color",
          speciesColorExpression
        )
        map.setPaintProperty("canopy-fill", "fill-opacity", 0.48)
        map.setPaintProperty("canopy-fill", "fill-outline-color", "#244b38")
        map.setPaintProperty("trees", "circle-color", speciesColorExpression)
        map.setPaintProperty("trees", "circle-opacity", 0.96)
        map.setPaintProperty("trees", "circle-radius", treeRadiusExpression)
        map.setPaintProperty("trees", "circle-stroke-color", "#ffffff")
        map.setPaintProperty("trees", "circle-stroke-width", 1.25)
        return
      }

      const matches = speciesMatchExpression(highlightedSpecies.name)
      const mutedColor = "#c4cec8"
      map.setPaintProperty("canopy-fill", "fill-color", [
        "case",
        matches,
        highlightedSpecies.color,
        mutedColor
      ])
      map.setPaintProperty("canopy-fill", "fill-opacity", [
        "case",
        matches,
        0.82,
        0.12
      ])
      map.setPaintProperty("canopy-fill", "fill-outline-color", [
        "case",
        matches,
        "#ffffff48",
        "#a4afa871"
      ])
      map.setPaintProperty("trees", "circle-color", [
        "case",
        matches,
        highlightedSpecies.color,
        mutedColor
      ])
      map.setPaintProperty("trees", "circle-opacity", [
        "case",
        matches,
        1,
        0.22
      ])
      map.setPaintProperty("trees", "circle-radius", [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        ["case", matches, 2, 1],
        16,
        ["case", matches, 3, 2],
        19,
        ["case", matches, 4.5, 3.5]
      ])
      map.setPaintProperty("trees", "circle-stroke-color", [
        "case",
        matches,
        "#ffffff",
        "#9aa79f"
      ])
      map.setPaintProperty("trees", "circle-stroke-width", [
        "case",
        matches,
        1.75,
        0.5
      ])
    }

    const updateLayerVisibility = () => {
      if (!mapReady) return

      map.setLayoutProperty(
        "canopy-fill",
        "visibility",
        canopyEnabled ? "visible" : "none"
      )
      map.setLayoutProperty(
        "trees",
        "visibility",
        treesEnabled ? "visible" : "none"
      )
      map.setLayoutProperty(
        "lulc-layer",
        "visibility",
        lulcEnabled ? "visible" : "none"
      )
    }

    const selectSpecies = (group) => {
      selectedSpecies = group
      highlightedSpecies =
        group.count > 0 || group.treeCount > 0 ? group : null
      selectedName.textContent = group.label
      selectedCount.textContent =
        `${group.count.toLocaleString()} canopy · ` +
        `${group.treeCount.toLocaleString()} trees`
      selectionPanel.hidden = false
      highlightButton.disabled = group.count === 0 && group.treeCount === 0
      highlightButton.textContent =
        group.count === 0 && group.treeCount === 0
          ? "No matching features"
          : "Highlight matching features"

      speciesList.querySelectorAll(".legend-item").forEach((item) => {
        const isSelected = item.dataset.group === group.key
        item.classList.toggle("legend-item-selected", isSelected)
        item.setAttribute("aria-pressed", String(isSelected))
      })

      applyCanopyStyle()
    }

    const resetLegend = () => {
      selectedSpecies = null
      highlightedSpecies = null
      selectionPanel.hidden = true
      highlightButton.disabled = false
      highlightButton.textContent = "Highlight matching features"

      speciesList.querySelectorAll(".legend-item").forEach((item) => {
        item.classList.remove("legend-item-selected")
        item.setAttribute("aria-pressed", "false")
      })

      applyCanopyStyle()
    }

    const addCanopyLegendItem = (group) => {
      const item = document.createElement("button")
      item.type = "button"
      item.className = "legend-item"
      item.dataset.group = group.key
      item.setAttribute("aria-pressed", "false")

      const swatch = document.createElement("span")
      swatch.className = "legend-color"
      swatch.style.backgroundColor = group.color

      const label = document.createElement("span")
      label.className = "legend-label"
      label.textContent = group.label

      const count = document.createElement("span")
      count.className = "legend-species-count"
      count.textContent = group.count.toLocaleString()
      count.title =
        `${group.count.toLocaleString()} canopy features; ` +
        `${group.treeCount.toLocaleString()} tree points`

      item.append(swatch, label, count)
      item.addEventListener("click", () => selectSpecies(group), {
        signal: eventController.signal
      })
      speciesList.appendChild(item)
    }

    species.forEach(addCanopyLegendItem)
    if (unnamedCount > 0 || unnamedGroup.treeCount > 0) {
      addCanopyLegendItem(unnamedGroup)
    }

    LULC_CLASSES.forEach(({ label, color }) => {
      const row = document.createElement("div")
      row.className = "lulc-legend-item"

      const swatch = document.createElement("span")
      swatch.className = "legend-color"
      swatch.style.backgroundColor = color

      const name = document.createElement("span")
      name.className = "legend-label"
      name.textContent = label

      row.append(swatch, name)
      lulcList.appendChild(row)
    })

    const setActiveTab = (tabName) => {
      activeTab = tabName
      legendTabs.forEach((tab) => {
        const selected = tab.dataset.tab === tabName
        tab.classList.toggle("active", selected)
        tab.setAttribute("aria-selected", String(selected))
        tab.tabIndex = selected ? 0 : -1
      })
      legendPanels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tabName
      })
      updateLayerVisibility()
    }

    legendTabs.forEach((tab) => {
      tab.addEventListener(
        "click",
        () => setActiveTab(tab.dataset.tab),
        { signal: eventController.signal }
      )
    })

    highlightButton.addEventListener(
      "click",
      () => {
        if (!selectedSpecies) return
        highlightedSpecies =
          highlightedSpecies === selectedSpecies ? null : selectedSpecies
        highlightButton.textContent = highlightedSpecies
          ? "Show all features"
          : "Highlight matching features"
        applyCanopyStyle()
      },
      { signal: eventController.signal }
    )
    resetButton.addEventListener("click", resetLegend, {
      signal: eventController.signal
    })

    this.el.appendChild(legend)
    this.legend = legend

    const selectSpeciesFromMap = (rawName) => {
      const name = normalizeName(rawName)
      const group = name ? speciesByName.get(name) : unnamedGroup

      if (group) {
        setActiveTab("canopy")
        selectSpecies(group)
      } else {
        resetLegend()
      }
    }

    map.on("load", () => {
      map.addSource("lulc-source", {
        type: "raster",
        tiles: ["/tiles/lulc/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 10,
        maxzoom: 18
      })
      map.addSource("canopy", {
        type: "geojson",
        data: canopyGeoJSON
      })
      map.addSource("trees", {
        type: "geojson",
        data: treeGeoJSON
      })

      map.addLayer({
        id: "lulc-layer",
        type: "raster",
        source: "lulc-source",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.85 }
      })
      map.addLayer({
        id: "canopy-fill",
        type: "fill",
        source: "canopy",
        paint: {
          "fill-color": speciesColorExpression,
          "fill-opacity": 0.48,
          "fill-outline-color": "#244b38"
        }
      })
      map.addLayer({
        id: "trees",
        type: "circle",
        source: "trees",
        paint: {
          "circle-radius": treeRadiusExpression,
          "circle-color": speciesColorExpression,
          "circle-opacity": 0.96,
          "circle-stroke-color": "#ffffff00",
          "circle-stroke-width": 1
        }
      })

      const zoomIn = controls?.querySelector("#zoom-in")
      const zoomOut = controls?.querySelector("#zoom-out")
      const toggleTrees = controls?.querySelector("#toggle-trees")
      const togglePolygons = controls?.querySelector("#toggle-polygons")
      const toggleLulc = controls?.querySelector("#toggle-lulc")

      treesEnabled = toggleTrees?.checked ?? true
      canopyEnabled = togglePolygons?.checked ?? true
      lulcEnabled = toggleLulc?.checked ?? false
      mapReady = true
      updateLayerVisibility()

      toggleTrees?.addEventListener(
        "change",
        () => {
          treesEnabled = toggleTrees.checked
          updateLayerVisibility()
        },
        { signal: eventController.signal }
      )
      togglePolygons?.addEventListener(
        "change",
        () => {
          canopyEnabled = togglePolygons.checked
          updateLayerVisibility()
        },
        { signal: eventController.signal }
      )
      toggleLulc?.addEventListener(
        "change",
        () => {
          lulcEnabled = toggleLulc.checked
          updateLayerVisibility()
        },
        { signal: eventController.signal }
      )
      zoomIn?.addEventListener("click", () => map.zoomIn(), {
        signal: eventController.signal
      })
      zoomOut?.addEventListener("click", () => map.zoomOut(), {
        signal: eventController.signal
      })

      map.on("click", "trees", (event) => {
        const feature = event.features?.[0]
        if (!feature) return

        selectSpeciesFromMap(
          feature.properties?.scientific_name_normalized ||
            scientificNameFrom(feature.properties)
        )
        this.pushEvent("tree_selected", {
          properties: feature.properties || {}
        })
      })

      map.on("click", "canopy-fill", (event) => {
        const feature = event.features?.[0]
        if (!feature) return

        if (map.queryRenderedFeatures(event.point, { layers: ["trees"] }).length) {
          return
        }

        selectSpeciesFromMap(
          feature.properties?.scientific_name_normalized ||
            scientificNameFrom(feature.properties)
        )
        this.pushEvent("tree_selected", {
          properties: feature.properties || {}
        })
      })

      for (const layerId of ["trees", "canopy-fill"]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer"
        })
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = ""
        })
      }
    })

    this.handleEvent("scroll_to_map_info", () => {
      mapInformationPanel?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    })
  },

  destroyed() {
    this.eventController?.abort()
    this.map?.remove()
    this.map = null
  }
}

export default TreeMap
