import React, { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";
import "./WebMapView.css";

export const WebMapView = () => {
  const mapRef = useRef();

  useEffect(() => {
    // lazy load the required ArcGIS API for JavaScript modules and CSS
    loadModules(
      [
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/widgets/Locate",
        "esri/widgets/Editor"
      ],
      { css: true }
    ).then(
      ([
        Map,
        MapView,
        FeatureLayer,
        GraphicsLayer,
        Graphic,
        Locate,
        Editor
      ]) => {
        const map = new Map({
          basemap: "topo-vector"
        });

        // load the map view at the ref's DOM node
        const view = new MapView({
          container: mapRef.current,
          map: map,
          center: [-71.622, 10.669],
          zoom: 18
        });

        var locate = new Locate({
          view: view,
          useHeadingEnabled: false,
          goToOverride: function(view, options) {
            options.target.scale = 1500; // Override the default map scale
            return view.goTo(options.target);
          }
        });

        view.ui.add(locate, "top-left");

        var editor = new Editor({
          view: view
        });

        view.ui.add(editor, "bottom-right");

        var featureLayer = new FeatureLayer({
          url:
            "https://services9.arcgis.com/4qsWbNKqg0ZZVI1u/arcgis/rest/services/SysM_FuerzaV_Dev/FeatureServer/4"
        });

        var graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        function addGraphics(result) {
          graphicsLayer.removeAll();
          result.features.forEach(function(feature) {
            var g = new Graphic({
              geometry: feature.geometry,
              attributes: feature.attributes,
              symbol: {
                type: "simple-marker",
                color: [0, 0, 0],
                outline: {
                  width: 2,
                  color: [0, 255, 255]
                },
                size: "20px"
              },
              popupTemplate: {
                title: "{TRL_NAME}",
                content: "This a {PARK_NAME} trail located in {CITY_JUR}."
              }
            });
            graphicsLayer.add(g);
          });
        }

        function queryFeatureLayer(
          point,
          distance,
          spatialRelationship,
          sqlExpression
        ) {
          var query = {
            geometry: point,
            distance: distance,
            spatialRelationship: spatialRelationship,
            outFields: ["*"],
            returnGeometry: true,
            where: sqlExpression
          };
          featureLayer.queryFeatures(query).then(function(result) {
            addGraphics(result, true);
          });
        }

        view.when(function() {
          queryFeatureLayer(view.center, 1500, "intersects");
        });

        view.on("click", function(event) {
          queryFeatureLayer(event.mapPoint, 1500, "intersects");
        });

        // Client-side query

        function queryFeatureLayerView(
          point,
          distance,
          spatialRelationship,
          sqlExpression
        ) {
          // Add the layer if it is missing
          if (!map.findLayerById(featureLayer.id)) {
            featureLayer.outFields = ["*"];
            map.add(featureLayer, 0);
          }
          // Set up the query
          var query = {
            geometry: point,
            distance: distance,
            spatialRelationship: spatialRelationship,
            outFields: ["*"],
            returnGeometry: true,
            where: sqlExpression
          };
          // Wait for the layerview to be ready and then query features
          view.whenLayerView(featureLayer).then(function(featureLayerView) {
            if (featureLayerView.updating) {
              var handle = featureLayerView.watch("updating", function(
                isUpdating
              ) {
                if (!isUpdating) {
                  // Execute the query
                  featureLayerView.queryFeatures(query).then(function(result) {
                    addGraphics(result);
                  });
                  handle.remove();
                }
              });
            } else {
              // Execute the query
              featureLayerView.queryFeatures(query).then(function(result) {
                addGraphics(result);
              });
            }
          });
        }

        view.when(function() {
          //*** UPDATE ***//
          //queryFeatureLayer(view.center, 1500, "intersects");
          queryFeatureLayerView(view.center, 1500, "intersects");
        });

        view.on("click", function(event) {
          //*** UPDATE ***//
          //queryFeatureLayer(event.mapPoint, 1500, "intersects");
          queryFeatureLayerView(event.mapPoint, 1500, "intersects");
        });
        return () => {
          if (view) {
            // destroy the map view
            view.container = null;
          }
        };
      }
    );
  });

  return <div className="webmap" ref={mapRef} />;
};
