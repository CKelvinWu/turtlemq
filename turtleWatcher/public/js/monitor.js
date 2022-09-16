$(() => {
  /*
  * Flot Interactive Chart
  * -----------------------
  */
  // We use an inline data source in the example, usually data would
  // be fetched from a server
  const updateInterval = 5000; // Fetch data ever x milliseconds
  const realtime = 'on'; // If == to on then fetch data every x seconds. else stop fetching
  const historyTime = 60 * 60 * 1000;

  function getData(result) {
    const currentTime = Date.now();
    let index = 1;
    const queue = result.competition;

    const res = [];
    for (let time = currentTime - historyTime; time < currentTime; time += 5000) {
      if (queue.length === 1) {
        res.push([time, queue[0]?.queueSize]);
      } else if (queue[index]?.time > time) {
        res.push([time, queue[index - 1]?.queueSize]);
      } else {
        index++;
        res.push([time, queue[index - 1]?.queueSize]);
      }
    }
    res.push([currentTime, queue[index - 1]?.queueSize]);
    return res;
  }

  function update() {
    $.ajax('http://localhost:3000/api/1.0/queue')
      .done((result) => {
        getData(result);
        const currentTime = Date.now();
        const start = currentTime - historyTime;
        const end = currentTime;
        const step = 6 * 60 * 1000;
        const arrayLength = Math.floor(((end - start) / step)) + 1;
        const range = [...Array(arrayLength).keys()].map((x) => (x * step) + start);
        const interactivePlot = $.plot(
          '#interactive',
          [
            {
              label: 'Foo', data: getData(result),
            },
          ],
          {
            grid: {
              borderColor: '#f3f3f3',
              borderWidth: 1,
              tickColor: '#f3f3f3',
            },
            series: {
              color: '#3c8dbc',
              lines: {
                lineWidth: 2,
                show: true,
                fill: true,
              },
            },
            yaxis: {
              ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100],
              min: 0,
              max: 100,
              show: true,
            },
            xaxis: {
              ticks: range,
              mode: 'time',
              timeBase: 'seconds',
              timeformat: '%H:%M:%S',
              min: 0,
              max: 100,
              show: true,
            },
          },
        );
        // interactivePlot.setData([getData()]);
        // Since the axes don't change, we don't need to call plot.setupGrid()
        interactivePlot.draw();
        if (realtime === 'on') {
          setTimeout(update, updateInterval);
        }
      });
  }
  // INITIALIZE REALTIME DATA FETCHING
  update();
  /*
  * END INTERACTIVE CHART
  */
});
