import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import { useThemeColors } from "../../hooks/useThemeColors.js";

function AlertsPieChart({ data, timeRange }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  const themeColors = useThemeColors();
  // Extracted primitive values for safe useEffect dependencies
  const bgSecondary = themeColors.bgSecondary;
  const textPrimary = themeColors.textPrimary;
  const textSecondary = themeColors.textSecondary;

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const width = 220;
    const height = 220;
    const radius = Math.min(width, height) / 2 - 10;
    const innerRadius = radius * 0.6; 

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Count alerts by type
    const typeCounts = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.type,
    );

    const pieData = Array.from(typeCounts, ([type, count]) => ({
      type,
      count,
    })).sort((a, b) => b.count - a.count);

    const total = d3.sum(pieData, (d) => d.count);

    // Color scale
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

    const pie = d3.pie().value((d) => d.count).sort(null);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 8);

    const arcs = svg
      .selectAll("arc")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => colorScale(d.data.type))
      .attr("stroke", bgSecondary)
      .attr("stroke-width", 2)
      .style("opacity", 0.9)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arcHover)
          .style("opacity", 1);

        const percentage = ((d.data.count / total) * 100).toFixed(1);
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`).html(`
            <strong>${d.data.type}</strong><br/>
            Count: ${d.data.count}<br/>
            ${percentage}% of total
          `);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arc)
          .style("opacity", 0.9);

        d3.select(tooltipRef.current).style("opacity", 0);
      })
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t));
        };
      });

    // Center label - Total count
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .style("font-size", "36px")
      .style("font-weight", "700")
      .style("fill", textPrimary) 
      .text(total);

    // Center label subtitle
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.4em")
      .style("font-size", "14px")
      .style("fill", textSecondary)
      .text("Total Alerts");

  }, [data, timeRange, bgSecondary, textPrimary, textSecondary]);

  const styles = {
    container: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "280px",
    },
    svg: {
      display: "block",
    },
    tooltip: {
      position: "fixed",
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-light)",
      borderRadius: "6px",
      padding: "8px 12px",
      fontSize: "12px",
      color: "var(--text-primary)",
      pointerEvents: "none",
      opacity: 0,
      zIndex: 1000,
      transition: "opacity 0.2s",
    },
  };

  return (
    <div style={styles.container}>
      <svg ref={svgRef} style={styles.svg} />
      <div ref={tooltipRef} style={styles.tooltip} />
    </div>
  );
}

AlertsPieChart.propTypes = {
  data: PropTypes.array.isRequired,
  timeRange: PropTypes.string.isRequired,
};

export default AlertsPieChart;