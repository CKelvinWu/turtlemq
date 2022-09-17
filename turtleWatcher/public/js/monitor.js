/* eslint-disable prefer-arrow-callback */
$(() => {
  /*
  * Flot Interactive Chart
  * -----------------------
  */
  // We use an inline data source in the example, usually data would
  // be fetched from a server
  const updateInterval = 5000; // Fetch data ever x milliseconds fetching
  const HISTORY_TIME = 60 * 60 * 1000;
  const HISTORY_INTERVAL = 5000;

  function getData(queue) {
    const res = [];
    const currentTime = Date.now();
    const startTime = currentTime - HISTORY_TIME;
    let index = 0;
    for (let time = startTime; time < currentTime; time += HISTORY_INTERVAL) {
      if (queue[index + 1]?.time < time) {
        res.push([time, queue[index]?.queueSize]);
        while (queue[index + 1]?.time < time) {
          index++;
        }
      } else {
        res.push([time, queue[index]?.queueSize]);
      }
    }
    res.push([currentTime, queue.at(-1)?.queueSize]);
    // console.log(res);
    // for (let i = 0; i < queue.length; i++) {
    //   res.push([queue[i]?.time, queue[i]?.queueSize]);
    // }

    return res;
  }

  function createPlot(name, maxLength) {
    let chartBody = $('<div></div>').addClass('card-body').attr('id', `queue-${name}`);
    const queueTitleH3 = $('<h3></h3>').addClass('card-title').text(`${name}  maxLength: ${maxLength}`);
    let progressBarHolderDiv = $('<div></div>').addClass('progress-bar-holder');
    const progressBarDiv = $('<div></div>').addClass('progress-bar').attr('id', `bar-${name}`);
    const interactiveDiv = $('<div></div>').addClass('interactive').attr('id', `interactive-${name}`).attr('data-queue', name)
      .css({ height: '300px', padding: '0px', position: 'relative' });
    progressBarHolderDiv = progressBarHolderDiv.append(progressBarDiv);
    chartBody = chartBody.append(queueTitleH3);
    chartBody = chartBody.append(progressBarHolderDiv);
    chartBody = chartBody.append(interactiveDiv);
    $('#chart-container').append(chartBody);
  }

  function deletePlot(name) {
    $(`#queue-${name}`).remove();
  }

  function update() {
    try {
      $.ajax('/api/1.0/queue')
        .done((result) => {
          const queueName = Object.keys(result);
          $('.interactive').each(function () {
            const queue = $(this).data('queue');
            const isExistQueue = queueName.includes(queue);
            if (!isExistQueue) {
              deletePlot(queue);
            }
          });

          queueName.forEach((name) => {
            const isPlot = $(`#interactive-${name}`).length;
            const { maxLength } = result[name];
            if (!isPlot) {
              createPlot(name, maxLength);
            }
            const res = getData(result[name].queueSize);
            // const start = res[0][0];
            // const end = res.at(-1)[0];
            // const step = Math.floor((end - start) / 15);
            // const arrayLength = Math.floor(((end - start) / step)) + 1;
            // const range = [...Array(arrayLength).keys()].map((x) => (x * step) + start);
            const interactivePlot = $.plot(
              `#interactive-${name}`,
              [
                {
                  label: name, data: getData(result[name].queueSize),
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
                  // ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100],
                  min: 0,
                  max: 100,
                  show: true,
                },
                xaxis: {
                  // ticks: range,
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
            const percentage = (res.at(-1)[1] / maxLength) * 100;
            $(`#bar-${name}`).text(`${Math.round(percentage, 2)} %`);

            if (percentage > 10) {
              $(`#bar-${name}`).animate({ width: `${15 + percentage * 4}px` }, 800);
            } else {
              $(`#bar-${name}`).css({ 'white-space': 'nowrap' }, 800).animate({ width: `${15}px` }, 800);
            }
          });
        });
    } catch (error) {
      console.log(error);
    }
    setTimeout(update, updateInterval);
  }
  // INITIALIZE REALTIME DATA FETCHING
  update();
  /*
  * END INTERACTIVE CHART
  */
});
