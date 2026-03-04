document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("list-container");
  const cardTemplate = document.getElementById("video-card-template").content;

  // Моковые данные
  const mockVideos = [
    { title: "Тбилиси", desc: "Вас что-то ждёт, но вы не знаете что.", img: "https://picsum.photos/120/80?random=1" },
    { title: "Белгород", desc: "Ночной Белгород", img: "https://picsum.photos/120/80?random=2" },
    { title: "Адлер", desc: "Адлер утром", img: "https://picsum.photos/120/80?random=3" }
  ];

  // Генерация карточек из template
  mockVideos.forEach((video, index) => {
    const cardElement = cardTemplate.cloneNode(true);
    cardElement.querySelector('.content__video-card-title').textContent = video.title;
    cardElement.querySelector('.content__video-card-description').textContent = video.desc;
    cardElement.querySelector('.content__video-card-thumbnail').src = video.img;
    
    // Добавляем класс текущей карточке
    if(index === 0) {
      cardElement.querySelector('.content__card-link').classList.add('content__card-link_current');
    }
    
    listContainer.appendChild(cardElement);
  });

  // Добавление кнопки "Показать еще"
  const buttonTemplate = document.getElementById("more-button-template").content;
  listContainer.appendChild(buttonTemplate.cloneNode(true));
});
