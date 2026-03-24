import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import { useThemeColors } from "../../hooks/useThemeColors.js";

function AlertsLineChart({ data, timeRange }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hoveredType, setHoveredType] = useState(null);
  const [disabledTypes, setDisabledTypes] = useState(new Set());
  
  const themeColors = useThemeColors();
  // Extracted primitive values for safe useEffect dependencies
  const textColor = themeColors.textSecondary;
  const borderColor = themeColors.borderLight;

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Normalize dates to day level (strip time) and group by type
    const normalizeToDay = (dateStr) => {
      const date = new Date(dateStr);
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ).toISOString();
    };

    const groupedData = d3.group(data, (d) => d.type);

    // Get all unique days and sort them
    const allDays = Array.from(
      new Set(data.map((d) => normalizeToDay(d.date))),
    ).sort((a, b) => new Date(a) - new Date(b));

    // Prepare line data for each type
    const lineData = Array.from(groupedData, ([type, values]) => {
      const dayCounts = new Map();
      allDays.forEach((day) => dayCounts.set(day, 0));

      values.forEach((v) => {
        const day = normalizeToDay(v.date);
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      });

      return {
        type,
        values: allDays.map((day) => ({
          date: new Date(day),
          count: dayCounts.get(day),
        })),
      };
    }).filter((d) => !disabledTypes.has(d.type));

    // Color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain([
        "Security breach",
        "Suspicious activity",
        "Policy violation",
        "Data access",
        "Malware detected",
        "Unauthorized access",
        "Ransomware attempt",
        "Phishing attempt",
        "Data exfiltration",
        "Network intrusion",
      ])
      .range([
        "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
        "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#A855F7",
      ]);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(allDays, (d) => new Date(d)))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(lineData, (d) => d3.max(d.values, (v) => v.count))])
      .nice()
      .range([height, 0]);

    // Grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

    // X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%b %d")))
      .style("color", textColor)
      .style("font-size", "12px");

    // Y axis
    svg
      .append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .style("color", textColor)
      .style("font-size", "12px");

    // Line generator
    const line = d3
      .line()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Draw lines
    lineData.forEach((seriesData) => {
      const path = svg
        .append("path")
        .datum(seriesData.values)
        .attr("fill", "none")
        .attr("stroke", colorScale(seriesData.type))
        .attr("stroke-width", hoveredType === seriesData.type ? 3 : 2)
        .attr("d", line)
        .style(
          "opacity",
          hoveredType === null || hoveredType === seriesData.type ? 1 : 0.3,
        )
        .style("transition", "opacity 0.2s, stroke-width 0.2s");

      // Animate line drawing
      const totalLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0);

      // Add dots for data points
      svg
        .selectAll(`.dot-${seriesData.type.replaceAll(/\s+/g, "-")}`)
        .data(seriesData.values)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(d.date))
        .attr("cy", (d) => yScale(d.count))
        .attr("r", 0)
        .attr("fill", colorScale(seriesData.type))
        .style(
          "opacity",
          hoveredType === null || hoveredType === seriesData.type ? 1 : 0.3,
        )
        .on("mouseenter", (event, d) => {
          d3.select(event.target).attr("r", 6);

          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("opacity", 1)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`).html(`
              <strong>${seriesData.type}</strong><br/>
              ${d3.timeFormat("%b %d, %Y")(d.date)}<br/>
              Alerts: ${d.count}
            `);
        })
        .on("mouseleave", (event) => {
          d3.select(event.target).attr("r", 4);
          d3.select(tooltipRef.current).style("opacity", 0);
        });

      // Show dots animation
      svg.selectAll("circle")
        .transition()
        .delay((d, i) => i * 50)
        .duration(500)
        .attr("r", 4);
    });

    // Clean up axes
    svg.selectAll(".domain").remove();
    svg.selectAll(".tick line").style("stroke", borderColor);

  }, [data, disabledTypes, hoveredType, timeRange, textColor, borderColor]);

  const alertTypes = data ? Array.from(new Set(data.map((d) => d.type))) : [];

  const colorScale = d3
    .scaleOrdinal()
    .domain([
      "Security breach", "Suspicious activity", "Policy violation",
      "Data access", "Malware detected", "Unauthorized access",
      "Ransomware attempt", "Phishing attempt", "Data exfiltration",
      "Network intrusion",
    ])
    .range([
      "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
      "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#A855F7",
    ]);

  const toggleType = (type) => {
    const newDisabled = new Set(disabledTypes);
    if (newDisabled.has(type)) {
      newDisabled.delete(type);
    } else {
      newDisabled.add(type);
    }
    setDisabledTypes(newDisabled);
  };

  const styles = {
    container: { position: "relative", width: "100%", height: "280px" },
    svg: { width: "100%", height: "220px" },
    tooltip: {
      position: "fixed",
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-light)",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "12px",
      color: "var(--text-primary)",
      pointerEvents: "none",
      opacity: 0,
      zIndex: 1000,
      transition: "opacity 0.2s",
    },
    legend: { display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "12px", justifyContent: "center" },
    legendItem: {
      display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
      color: "var(--text-secondary)", cursor: "pointer", transition: "opacity 0.2s",
      background: "none", border: "none", padding: "4px 8px", borderRadius: "4px",
    },
    legendColor: { width: "8px", height: "8px", borderRadius: "8px" },
  };

  return (
    <div style={styles.container}>
      <svg ref={svgRef} style={styles.svg} />
      <div ref={tooltipRef} style={styles.tooltip} />

      <div style={styles.legend}>
        {alertTypes.map((type) => (
          <button
            key={type}
            type="button"
            style={{
              ...styles.legendItem,
              opacity: disabledTypes.has(type) ? 0.4 : 1,
            }}
            onClick={() => toggleType(type)}
            onMouseEnter={(e) => {
              setHoveredType(type);
              e.currentTarget.style.backgroundColor = themeColors.lightOverlay;
            }}
            onMouseLeave={(e) => {
              setHoveredType(null);
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div style={{ ...styles.legendColor, backgroundColor: colorScale(type) }} />
            <span>{type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

AlertsLineChart.propTypes = {
  data: PropTypes.array.isRequired,
  timeRange: PropTypes.string.isRequired,
};

export default AlertsLineChart;