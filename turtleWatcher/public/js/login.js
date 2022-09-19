$(() => {
  $('#login').on('click', (e) => {
    e.preventDefault();
    const user = $('.user').val();
    const password = $('.password').val();
    // console.log(user);
    // console.log(password);
    // $('.error').remove();
    $.ajax({
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      url: '/api/1.0/user/login',
      data: JSON.stringify({ user, password }),
      success: () => {
        console.log('success');
        window.location.href = '/';
      },
      // error: (err) => {
      //   const errors = err.responseJSON?.errors;
      //   const message = err.responseJSON?.message;
      //   if (errors) {
      //     for (const error of errors) {
      //       $('.account-inputs').prepend(`<p class='error'>${error}</p>`);
      //     }
      //   }
      //   if (message) {
      //     $('.account-inputs').prepend(`<p class='error'>${message}</p>`);
      //   }
      // },
    });
  });
});
