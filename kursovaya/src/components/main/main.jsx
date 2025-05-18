import axios from 'axios'
import {Link} from 'react-router-dom'
import './main.css'
import imgBooks from './books.jpg'
import imgAuthors from './authors.jpg'
import imgPrev from './prev.jpg'
import Search from './search'
import Comments from './comments';

function MainContent(){
    return(
        <>
        <div className = "result">
            <Search/>
        </div>
        <div className = "main_prev">
            <div className = "table_prev">
                <div className = "prev">
                    <div className = "text_prev">
                        <h2 className = "h_prev">Здесь вы можете</h2>
                        <p className = "h_prev">Найти книгу</p>
                        <p className = "h_prev">Найти автора</p>
                        <p className = "h_prev">Забронировать книгу</p>
                        <p className = "h_prev">Заказать книгу в библиотеку</p>
                    </div>
                    <div className='img_div_prev'>
                        <img className='img_prev' src={imgPrev} alt="prev" />
                    </div>
                </div>
            </div>
        </div>
        <div className = "main_tab">
            <Link className = "table" to={'popular_books'}>
               <div className = "books">
                 <div className='img_div'>
                     <img className='img' src={imgBooks} alt="books" />
                 </div>
                 <h2 className = "h2">Популярные книги</h2>
               </div>
            </Link>
           <Link className = "table" to={'books_table'}>
               <div className = "books">
                 <div className='img_div'>
                     <img className='img' src={imgBooks} alt="books" />
                 </div>
                 <h2 className = "h2">Книги</h2>
               </div>
            </Link>
        </div>
        <Comments/>
        </>
        )
}
export default MainContent