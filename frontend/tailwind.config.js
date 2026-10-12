/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // Cho phép chế độ Dark Mode nếu bạn dùng
  theme: {
    extend: {
      colors: {
        // Tông màu xanh Organic chủ đạo của Luxe Glow
        "primary": "#3A5A40", 
        "organic-green": "#4a7c59",
        "background-light": "#f7f6f6",
        "background-dark": "#1c1617",
        "accent-soft": "#a3b18a",
      },
      fontFamily: {
        // Khai báo font Manrope như trong Home.html
        "display": ["Manrope", "sans-serif"],
        "sans": ["Manrope", "sans-serif"],
      },
      borderRadius: {
        // Bo góc đặc trưng của giao diện (0.75rem)
        "DEFAULT": "0.75rem",
        "lg": "0.75rem",
        "xl": "0.75rem",
      },
      animation: {
        // Thêm hiệu ứng trượt nhẹ nếu cần cho các khối
        'fade-up': 'fade-up 0.5s ease-out forwards',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}








