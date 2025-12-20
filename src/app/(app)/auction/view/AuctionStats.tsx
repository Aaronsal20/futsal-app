"use client"

import { useRef, useEffect } from "react"
import * as d3 from "d3"
import { Title, SimpleGrid, Paper } from "@mantine/core"

interface Team {
  id: string
  name: string
}

interface AuctionPlayer {
  id: string
  team: Team | null
  price: number | null
  status: "sold" | "unsold"
  player: {
    position?: string
  }
}

export default function AuctionStatsChart({
  teams,
  auctionPlayers,
  budget = 1000
}: {
  teams: Team[]
  auctionPlayers: AuctionPlayer[]
  budget?: number
}) {
  const spentRef = useRef<SVGSVGElement | null>(null)
  const purseRef = useRef<SVGSVGElement | null>(null)
  const histRef = useRef<SVGSVGElement | null>(null)
  const roleDistRef = useRef<SVGSVGElement | null>(null)
  const avgCostRef = useRef<SVGSVGElement | null>(null)

  // Shared settings
  const width = 400
  const height = 250
  const margin = { top: 20, right: 20, bottom: 40, left: 60 }

  // 1. Bar Chart: Spent per team
  useEffect(() => {
    if (!spentRef.current) return

    const data = teams.map((team) => {
      const spent = auctionPlayers
        .filter((ap) => ap.team?.id === team.id && ap.status === "sold")
        .reduce((acc, ap) => acc + (ap.price || 0), 0)
      return { name: team.name, spent }
    })

    const svg = d3.select(spentRef.current)
    svg.selectAll("*").remove()

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "auction-tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "0.95em")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
      .style("display", "none")
      .style("z-index", "1000")

    const chart = svg
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, width - margin.left - margin.right])
      .padding(0.2)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.spent) || 0])
      .nice()
      .range([height - margin.top - margin.bottom, 0])

    chart
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")

    chart.append("g").call(d3.axisLeft(y))

    chart
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name)!)
      .attr("y", (d) => y(d.spent))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - margin.top - margin.bottom - y(d.spent))
      .attr("fill", "#1971c2")
      .on("mousemove", function (event, d) {
        tooltip
          .style("display", "block")
          .html(`<strong>${d.name}</strong><br/>Spent: ₹${d.spent.toLocaleString()}`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 20 + "px")
      })
      .on("mouseleave", function () {
        tooltip.style("display", "none")
      })
    return () => { tooltip.remove(); };
  }, [teams, auctionPlayers])

  // 2. Bar Chart: Purse left per team
  useEffect(() => {
    if (!purseRef.current) return;

    const data = teams.map((team) => {
      const spent = auctionPlayers
        .filter((ap) => ap.team?.id === team.id && ap.status === "sold")
        .reduce((acc, ap) => acc + (ap.price || 0), 0);
      return { name: team.name, purseLeft: budget - spent };
    });

    const svg = d3.select(purseRef.current);
    svg.selectAll("*").remove();

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "auction-tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "0.95em")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
      .style("display", "none")
      .style("z-index", "1000")

    const chart = svg
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, width - margin.left - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, budget])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    chart
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")

    chart.append("g").call(d3.axisLeft(y));

    chart
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name)!)
      .attr("y", (d) => y(d.purseLeft))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - margin.top - margin.bottom - y(d.purseLeft))
      .attr("fill", "#2f9e44")
      .on("mousemove", function (event, d) {
        tooltip
          .style("display", "block")
          .html(`<strong>${d.name}</strong><br/>Purse Left: ₹${d.purseLeft.toLocaleString()}`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseleave", function () {
        tooltip.style("display", "none");
      });
    return () => { tooltip.remove(); };
  }, [teams, auctionPlayers, budget]);

  // 3. Histogram: Player prices
  useEffect(() => {
    if (!histRef.current) return

    const prices = auctionPlayers
      .filter((ap) => ap.status === "sold" && ap.price)
      .map((ap) => ap.price!) 

    const bins = d3.bin().thresholds(10)(prices)

    const svg = d3.select(histRef.current)
    svg.selectAll("*").remove()

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "auction-tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "0.95em")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
      .style("display", "none")
      .style("z-index", "1000")

    const chart = svg
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(prices) || 0])
      .nice()
      .range([0, width - margin.left - margin.right])

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length) || 0])
      .range([height - margin.top - margin.bottom, 0])

    chart
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))

    chart.append("g").call(d3.axisLeft(y))

    chart
      .selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.x0!))
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
      .attr("height", (d) => height - margin.top - margin.bottom - y(d.length))
      .attr("fill", "#74c0fc")
      .on("mousemove", function (event, d) {
        tooltip
          .style("display", "block")
          .html(`<strong>₹${d.x0!.toLocaleString()} - ₹${d.x1!.toLocaleString()}</strong><br/>Count: ${d.length}`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 20 + "px")
      })
      .on("mouseleave", function () {
        tooltip.style("display", "none")
      })
    return () => { tooltip.remove(); };
  }, [auctionPlayers])

  // 4. Stacked Bar Chart: Role Distribution per Team
  useEffect(() => {
    if (!roleDistRef.current) return

    const roles = ['goalkeeper', 'defender', 'mid', 'forward']
    const roleColors = d3.scaleOrdinal()
      .domain(roles)
      .range(['#ffd43b', '#40c057', '#228be6', '#fa5252'])

    const data = teams.map(team => {
      const teamPlayers = auctionPlayers.filter(ap => ap.team?.id === team.id && ap.status === 'sold')
      const counts: any = { name: team.name }
      roles.forEach(role => {
        counts[role] = teamPlayers.filter(ap => ap.player.position?.toLowerCase() === role).length
      })
      return counts
    })

    const stack = d3.stack().keys(roles)(data)

    const svg = d3.select(roleDistRef.current)
    svg.selectAll("*").remove()

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "auction-tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "0.95em")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
      .style("display", "none")
      .style("z-index", "1000")

    const chart = svg
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width - margin.left - margin.right])
      .padding(0.2)

    const y = d3.scaleLinear()
      .domain([0, d3.max(stack, layer => d3.max(layer, d => d[1])) || 0])
      .nice()
      .range([height - margin.top - margin.bottom, 0])

    chart.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")

    chart.append("g").call(d3.axisLeft(y).ticks(5))

    const layer = chart.selectAll(".layer")
      .data(stack)
      .enter().append("g")
      .attr("class", "layer")
      .attr("fill", (d) => roleColors(d.key) as string)

    layer.selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", (d: any) => x(d.data.name)!)
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .on("mousemove", function (event, d) {
        // @ts-ignore
        const role = d3.select(this.parentNode).datum().key
        const count = d[1] - d[0]
        tooltip
          .style("display", "block")
          .html(`<strong>${role}</strong><br/>Count: ${count}`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 20 + "px")
      })
      .on("mouseleave", function () {
        tooltip.style("display", "none")
      })

    // Legend
    const legend = svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "end")
      .selectAll("g")
      .data(roles.slice().reverse())
      .enter().append("g")
      .attr("transform", (d, i) => `translate(0,${i * 20})`)

    legend.append("rect")
      .attr("x", width - 19)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", d => roleColors(d) as string)

    legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text(d => d)

    return () => { tooltip.remove(); };
  }, [teams, auctionPlayers])

  // 5. Bar Chart: Average Cost by Position
  useEffect(() => {
    if (!avgCostRef.current) return

    const roles = ['goalkeeper', 'defender', 'mid', 'forward']
    const data = roles.map(role => {
      const rolePlayers = auctionPlayers.filter(ap => 
        ap.status === 'sold' && 
        ap.player.position?.toLowerCase() === role &&
        ap.price
      )
      const avgPrice = rolePlayers.length > 0
        ? rolePlayers.reduce((acc, ap) => acc + (ap.price || 0), 0) / rolePlayers.length
        : 0
      return { role, avgPrice }
    })

    const svg = d3.select(avgCostRef.current)
    svg.selectAll("*").remove()

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "auction-tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "0.95em")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
      .style("display", "none")
      .style("z-index", "1000")

    const chart = svg
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand()
      .domain(data.map(d => d.role))
      .range([0, width - margin.left - margin.right])
      .padding(0.2)

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.avgPrice) || 0])
      .nice()
      .range([height - margin.top - margin.bottom, 0])

    chart.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))

    chart.append("g").call(d3.axisLeft(y))

    chart.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.role)!)
      .attr("y", d => y(d.avgPrice))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.top - margin.bottom - y(d.avgPrice))
      .attr("fill", "#be4bdb")
      .on("mousemove", function (event, d) {
        tooltip
          .style("display", "block")
          .html(`<strong>${d.role}</strong><br/>Avg Price: ₹${Math.round(d.avgPrice).toLocaleString()}`)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 20 + "px")
      })
      .on("mouseleave", function () {
        tooltip.style("display", "none")
      })

    return () => { tooltip.remove(); };
  }, [auctionPlayers])

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">💸 Spent per Team</Title>
        <svg ref={spentRef} style={{ width: '100%', height: 'auto' }}></svg>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">🏦 Purse Left per Team</Title>
        <svg ref={purseRef} style={{ width: '100%', height: 'auto' }}></svg>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">💵 Price Distribution</Title>
        <svg ref={histRef} style={{ width: '100%', height: 'auto' }}></svg>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">📊 Role Distribution per Team</Title>
        <svg ref={roleDistRef} style={{ width: '100%', height: 'auto' }}></svg>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="md">💰 Average Cost by Position</Title>
        <svg ref={avgCostRef} style={{ width: '100%', height: 'auto' }}></svg>
      </Paper>
    </SimpleGrid>
  )
}
