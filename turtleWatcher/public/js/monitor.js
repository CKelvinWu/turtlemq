/* eslint-disable prefer-arrow-callback */
$(() => {
  /*
  * Flot Interactive Chart
  * -----------------------
  */
  // We use an inline data source in the example, usually data would
  // be fetched from a server
  const updateInterval = 5000; // Fetch data ever x milliseconds fetching

  function getData(queue) {
    const res = [];
    const currentTime = Date.now();
    for (let i = 0; i < queue.length; i++) {
      res.push([queue[i]?.time, queue[i]?.queueSize]);
    }
    res.push([currentTime, queue.at(-1)?.queueSize]);

    return res;
  }

  function createPlot(name) {
    const chartBody = $('<div></div>').addClass('card-body').attr('data-queue', `${name}`);
    const progressBarContainer = $('<div></div>').addClass('progress-bar-container d-flex align-items-center justify-content-between').attr('data-queue', `${name}`);

    const leftDiv = $('<div></div>').addClass('left-bar d-flex align-items-center');
    const rightDiv = $('<div></div>').addClass('right-bar d-flex align-items-center');

    const queueTitleH3 = $('<img src="/public/images/turtle1.png">').addClass('turtle-icon');
    const queueSpan = $('<span></span>').addClass('queue-name').text(`${name}`);
    const queueCapacity = $('<span></span>').addClass('queue-size').attr('data-queue', `${name}`);
    const progressBarHolderDiv = $('<div></div>').addClass('progress-bar-holder');
    const trashIcon = $('<a><i class="fa-solid fa-trash-can"></i></a>').addClass(`delete-${name} delete-btn`).attr('data-delete', `${name}`);
    const arrowIcon = $('<i class="fas fa-chevron-up"></i>');
    const progressBarDiv = $('<div></div>').addClass('progress-bar').attr('data-queue', `${name}`);

    const interactiveWrap = $('<div></div>').addClass('interactive-wrap');
    const interactiveDiv = $('<div></div>').addClass('interactive').attr('data-queue', `${name}`).css({ height: '300px', padding: '0px', position: 'relative' });

    queueTitleH3.appendTo(leftDiv);
    queueSpan.appendTo(leftDiv);

    progressBarDiv.appendTo(progressBarHolderDiv);
    progressBarHolderDiv.appendTo(leftDiv);
    queueCapacity.appendTo(leftDiv);
    trashIcon.appendTo(rightDiv);
    arrowIcon.appendTo(rightDiv);

    leftDiv.appendTo(progressBarContainer);
    rightDiv.appendTo(progressBarContainer);

    progressBarContainer.appendTo(chartBody);
    interactiveDiv.appendTo(interactiveWrap);
    interactiveWrap.appendTo(chartBody);
    $('#chart-container').append(chartBody);

    $('<div class="tooltip-inner" id="line-chart-tooltip"></div>').css({
      position: 'absolute',
      display: 'none',
      opacity: 0.8,
    }).appendTo('body');

    $(`.progress-bar-container[data-queue='${name}`).on('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).parent().toggleClass('fold-card');
      $(this).find('.fa-chevron-up').toggleClass('active');
    });

    $(`.delete-btn[data-delete='${name}`).on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
          confirmButton: 'btn btn-danger',
          cancelButton: 'btn btn-success',
        },
        buttonsStyling: false,
      });

      swalWithBootstrapButtons.fire({
        title: `Are you sure to delete '${name}'?`,
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel!',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          deleteQueue(name);
        }
      });
    });
  }

  function deletePlot(name) {
    $(`.card-body[data-queue='${name}']`).slideUp(500, function () { $(`.card-body[data-queue='${name}']`).remove(); });
  }

  function update() {
    try {
      $.ajax('/api/1.0/queue')
        .done((result) => {
          const { queueInfo, master, replicas } = result;
          const queueNames = Object.keys(queueInfo);
          $('.interactive').each(function () {
            const queue = $(this).data('queue');
            // console.log($(this).prev().children().children().html());
            const isExistQueue = queueNames.includes(queue);
            if (!isExistQueue) {
              deletePlot(queue);
            }
          });

          queueNames.forEach((name) => {
            const card = $(`.card-body[data-queue='${name}']`);
            const { maxLength } = queueInfo[name];
            const { queueSize } = queueInfo[name].queueSize.at(-1);
            if (!card.length) {
              createPlot(name);
              // const interactive = card.children('.interactive');
              $(`.interactive[data-queue='${name}']`).bind('plothover', function (event, pos, item) {
                if (item) {
                  const y = item.datapoint[1].toFixed(0);
                  $('#line-chart-tooltip').html(`${y}`)
                    .css({
                      top: item.pageY + 5,
                      left: item.pageX + 5,
                    })
                    .fadeIn(200);
                } else {
                  $('#line-chart-tooltip').hide();
                }
              });
            }
            // update queue size

            $(`.queue-size[data-queue='${name}']`).text(`${queueSize} / ${maxLength}`);
            const res = getData(queueInfo[name].queueSize);
            const interactivePlot = $.plot(
              `.interactive[data-queue='${name}']`,
              [
                {
                  label: name,
                  data: res,
                },
              ],
              {
                grid: {
                  hoverable: true,
                  borderColor: '#f5f5f5',
                  borderWidth: 1,
                  tickColor: '#f5f5f5',
                },
                series: {
                  color: '#588157',
                  lines: {
                    lineWidth: 2,
                    show: true,
                    fill: true,
                  },
                },
                yaxis: {
                  show: true,
                },
                xaxis: {
                  mode: 'time',
                  timeBase: 'miliseconds',
                  timeformat: '%H:%M',
                  show: true,
                },
              },
            );

            // interactivePlot.setData([getData(result[name].queueSize)]);
            // Since the axes don't change, we don't need to call plot.setupGrid()
            // interactivePlot.setupGrid();
            interactivePlot.draw();
            const threshold = 10;
            const percentage = (res.at(-1)[1] / maxLength) * 100;
            if (percentage > threshold) {
              $(`.progress-bar[data-queue='${name}']`).css({
                transition: ' 0.5s', 'transition-timing-function': 'linear', width: `${percentage}%`, color: 'white',
              }, 800).text(`${Math.round(percentage, 2)}%`);
            } else {
              $(`.progress-bar[data-queue='${name}']`).css({
                transition: ' 0.5s', 'transition-timing-function': 'linear', width: `${percentage}%`, overflow: 'visible', color: 'black',
              }, 800).text(`${Math.round(percentage, 2)}%`);
            }
          });

          // render master and replicas
          const masterip = $('.master-ip').text();
          const replicaList = $('.replica-ip');
          const replicaipList = [];
          const replicaips = replicas?.map((replica) => replica.ip);
          replicaList.each(function () {
            // remove not exist replica
            if (!replicaips?.includes($(this).text())) {
              $(this).parent().remove();
            }
            replicaipList.push($(this).text());
          });

          if (master.ip !== masterip) {
            $('.master-ip').text(master.ip);
          }
          if (master.state === 'unhealthy') {
            $('.dropdown-master .status').addClass('unhealthy');
          } else {
            $('.dropdown-master .status').removeClass('unhealthy');
          }

          if (replicas) {
            for (let i = 0; i < replicas.length; i++) {
              const replica = replicas[i];
              // create new replica
              if (!replicaipList.includes(replica.ip)) {
                const replicadiv = `<div class="dropdown-item d-flex align-items-center"><div class="status"></div><div class="replica-ip">${replica.ip}</div></div>`;
                $(replicadiv).appendTo($('#dropdown-content-replica'));
              }
              if (replica.state === 'unhealthy') {
                $($('.dropdown-replica .status')[i]).addClass('unhealthy');
              } else {
                $($('.dropdown-replica .status')[i]).removeClass('unhealthy');
              }
            }
          }
        });
    } catch (error) {
      console.log(error);
    }
  }

  const produceForms = $('.needs-validation-produce');
  // Prevent produce submission
  Array.prototype.slice.call(produceForms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity()) {
          $.ajax({
            url: '/api/1.0/queue/produce',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              queue: $('#produce-queue').val(),
              messages: [
                $('#produce-messages').val(),
              ],
            }),
          }).done(() => {
            $('.produce-success').slideDown(500, () => {});
            setTimeout(() => {
              $('.produce-success').slideUp(500, () => {});
            }, 2000);
          });
        }

        form.classList.add('was-validated');
      }, false);
    });

  const consumeForms = $('.needs-validation-consume');
  // Prevent produce submission
  Array.prototype.slice.call(consumeForms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity()) {
          $.ajax({
            url: '/api/1.0/queue/consume',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              queue: $('#consume-queue').val(),
              quantity: $('#consume-quantity').val(),
            }),
          }).done((result) => {
            Swal.fire(`Consume messages: ${JSON.stringify(result.messages).replace(/</g, '&lt;').replace(/>/g, '&gt;')}`);
          });
        }

        form.classList.add('was-validated');
      }, false);
    });

  const changePasswordForms = $('.needs-validation-password');
  // Prevent produce submission
  Array.prototype.slice.call(changePasswordForms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity()) {
          $.ajax({
            url: '/api/1.0/user/password',
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              currentPassword: $('#currentPassword').val(),
              newPassword: $('#newPassword').val(),
            }),
          }).done((result) => {
            console.log(result);
            Swal.fire(`${result.responseJSON.message}`);
          }).fail((result) => {
            console.log(result.responseJSON.message);
            Swal.fire(`${result.responseJSON.message}`);
          });
        }

        form.classList.add('was-validated');
      }, false);
    });

  function deleteQueue(queue) {
    $.ajax({
      url: '/api/1.0/queue/delete',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        queue,
      }),
    }).done(() => {
      console.log();
      $(`.card-body[data-queue='${queue}']`).slideUp(300, function () { $(`.card-body[data-queue='${queue}']`).remove(); });
      update();
    });
  }

  function recursiveUpdate() {
    update();
    setTimeout(recursiveUpdate, updateInterval);
  }
  // INITIALIZE REALTIME DATA FETCHING
  recursiveUpdate();
  /*
  * END INTERACTIVE CHART
  */
});
